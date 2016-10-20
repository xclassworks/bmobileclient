import React, { Component } from 'react';
import {
    ListView,
    ScrollView,
    View,
    Text,
    Image
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import RTCCamera from './RTCCamera';

const styles = {
    viewerContainer: {
        flex:               1,
        flexDirection:      'column',
        justifyContent:     'center'
    },
    viewer: {
        alignItems:         'center',
        margin:             10,
        borderRadius:       50,
        width:              80,
        height:             80
    },
    viewerStage: {
        width:          76,
        height:         76,
        borderRadius:   50,
        borderWidth:    4,
        borderColor:    'rgba(50,207,159,0.5)',
        overflow:       'hidden'
    }
};

export default class ViewersList extends Component {
    constructor(props) {
        super(props);

        this.socket = props.socket;
        this.PC = props.peerConnection;

        this.state = {
            viewers: []
        };

        if (this.socket)
            this.listenToSocketViewersEvents();

        if (this.PC)
            this.listenToStreamPCEvents();
    }

    listenToSocketViewersEvents() {

        this.socket.on('viewer_add', (array) => {
            const viewer = array[0];

            const newViewers = this.state.viewers.splice(0);

            newViewers.push(viewer);

            this.setState({
                viewers: newViewers
            });
        });

        this.socket.on('viewer_left', (array) => {
            const viewer = array[0];
            const newViewers = this.state.viewers.filter((v) => {
                return v.id != viewer.id;
            });

            this.setState({
                viewers: newViewers
            });
        });
    }

    listenToStreamPCEvents() {
        const PC = this.PC;

        PC.onaddstream = (event) => {
            const lastViewer = this.state.viewers[0];

            if (lastViewer) {
                lastViewer.stream = event.stream.toURL();

                this.setState({
                    viewers: [lastViewer]
                });

                this.requestViewerOffer(lastViewer);
            }
        };

        // PC.onremovestream = (event) => console.log('On the onremovestream event', event);
    }

    requestViewerOffer(viewer) {
        this.socket.emit('signaling_message', { type: 'viewer_request_offer', to: viewer.id });
    }

    findViewer(id) {
        const filteredList = this.state.viewers.map((v) => {
            return v.id == id;
        });

        if (filteredList.length > 0)
            return filteredList[0];
    }

    _renderRow(viewer) {

        if (viewer.stream) {
            <View style={styles.viewer}>
                <RTCView stream={viewer.stream} style={styles.viewerStage} />
            </View>
        } else {
            return (
                <View style={styles.viewer}>
                    <Image
                        style={styles.viewerStage}
                        source={{ uri: "https://s-media-cache-ak0.pinimg.com/564x/fd/0c/55/fd0c559856ca991e9e28937dc802f0b0.jpg" }}
                    />
                </View>
            );
        }
    }

    render() {
        return (
            <ScrollView contentContainerStyle={styles.viewerContainer}>
                {
                    this.state.viewers.map(this._renderRow)
                }
            </ScrollView>
        );
    }
}
