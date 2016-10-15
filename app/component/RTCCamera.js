import React, { Component } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ToastAndroid
} from 'react-native';
import {
    RTCPeerConnection,
    RTCMediaStream,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStreamTrack,
    getUserMedia
} from 'react-native-webrtc';

// Bmate configurations
import CONFIGS from '../bconfig/configs.json';

// Component style
const styles = StyleSheet.create({
    fallbackRTCView: {
        width:      300,
        height:     300
    }
});

export default class RTCCamera extends Component {
    constructor(props) {
        super(props);

        this.state = {
            stream:     null,
            streamURL:  null,
            rtcViewStyle: props.style || styles.fallbackRTCView
        };

        if (!props.socket) {
            console.log('Impossible make a RTC stream without a signaling socket');

            return;
        }

        this.socket = props.socket;
        this.PC = null;

        this.createPeerConnection();
        this.getUserMedia();
    }

    render() {
        return (
            <RTCView streamURL={this.state.streamURL} style={this.state.rtcViewStyle} />
        );
    }

    createPeerConnection() {
        // Local Peer Connection
        const PC = new RTCPeerConnection(CONFIGS.webRTC);

        // Signaling socket
        const socket = this.socket;

        // Peer Connection events

        PC.onicecandidate = (event) => {

            if (event.candidate)
                socket.emit('signalingMessage', { type: 'candidate', candidate: event.candidate });
        };

        PC.oniceconnectionstatechange = (event) => console.log('oniceconnectionstatechange',
                                                                event.target.iceConnectionState);

        PC.onsignalingstatechange = (event) => console.log('onsignalingstatechange',
                                                                event.target.signalingState);

        PC.onaddstream = (event) => console.log('onaddstream', event.stream);

        PC.onremovestream = (event) => console.log('onremovestream', event.stream);

        this.PC = PC;
    }

    getUserMedia() {
        MediaStreamTrack.getSources(sourcesInfos => {
            const videoSourceList = sourcesInfos.filter(sourceInfo => {
                return sourceInfo.kind == 'video' && sourceInfo.facing == 'front';
            });

            if (videoSourceList.length === 0) {
                alertProblem('No video available in device');
            } else {
                // Get the first available video source id
                const videoSourceId = videoSourceList[0].id;

                const successHandler = (stream) => {
                    this.PC.addStream(stream);

                    this.setState({ streamURL: stream.toURL() });
                    this.setState({ stream: stream });

                    this.createSignalingChannel();
                };

                const userMediaConfig = {
                    audio: true,
                    video: {
                        facingMode: 'front',
                        mandatory: {},
                        optional: [ { sourceId: videoSourceId } ]
                    }
                };

                getUserMedia(userMediaConfig, successHandler, generalErrorHandler);
            }
        });
    }

    createSignalingChannel() {
        const PC = this.PC;
        const socket = this.socket;

        socket.on('signaling_message', (message) => {
            const msg = message[0];

            switch (msg.type) {
                case 'offer':
                    setRemoteDescription(msg.desc);
                    break;
                case 'candidate':
                    const candidate = new RTCIceCandidate(msg.candidate);

                    PC.addIceCandidate(candidate,
                        () => console.log('Ice candidate added with success', candidate),
                        (err) => generalErrorHandler('Error adding ice candidate', err,
                                                        candidate)
                    );
                    break;
                case 'request_offer':
                    createOffer(msg);
                    break;
            }
        });

        // Signaling channel functions

        function createOffer(msg) {
            const onCreateOfferSuccess = (desc) => {

                PC.setLocalDescription(desc,
                    () => {
                        const response = {
                            type:   'offer',
                            to:     msg.from,
                            desc:   PC.localDescription
                        };

                        socket.emit('signalingMessage', response);
                    },
                    generalErrorHandler);
            };

            const offerConstraints = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            };

            PC.createOffer(onCreateOfferSuccess, generalErrorHandler, offerConstraints);
        }

        function setRemoteDescription(desc) {
            const onRemoteDescriptionSuccess = () => {
                console.log('Set remote description completed with success');
            };

            PC.setRemoteDescription(new RTCSessionDescription(desc),
                onRemoteDescriptionSuccess,
                generalErrorHandler
            );
        }
    }
}

// Utils functions

function alertProblem(...messages) {
    const msg = messages.join(' ');

    console.log(msg);

    ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function generalErrorHandler(error) {
    alertProblem(error.toString());
}
