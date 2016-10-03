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
import Socket from 'react-native-socketio';

// Bmate configurations
import CONFIGS from '../bconfig/configs.json';

// Component style
const styles = StyleSheet.create({
    defaultRTCView: {
        width:          500,
        height:         300
    }
});

export default class RTCCamera extends Component {
    constructor(props) {
        super(props);

        console.log(props);

        this.state = {
            stream:     null,
            streamURL:  null
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
            <RTCView streamURL={this.state.streamURL} style={styles.defaultRTCView} />
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

        socket.on('signalingMessage', (message) => {
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
                case 'sendOffer':
                    createOffer();
                    break;
            }
        });

        // Signaling channel functions

        function createOffer() {
            const onCreateOfferSuccess = (desc) => {

                PC.setLocalDescription(desc,
                    () => socket.emit('signalingMessage', { type: 'offer', desc: PC.localDescription }),
                    generalErrorHandler);
            }

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
