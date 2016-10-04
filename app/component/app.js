import React, { Component } from 'react';
import {
    AppRegistry,
    Image,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
    ToastAndroid,
    Text
} from 'react-native';
import RTCCamera from './RTCCamera';

import Socket from 'react-native-socketio';
import USBSerial from 'react-native-usbserial';
import CONFIG from '../bconfig/configs.json';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection:      'column',
        backgroundColor:    '#f4f4f4',
        justifyContent:     'center',
        alignItems:         'center'
    },
    overlay: {
        position: 'absolute',
        padding: 16,
        right: 0,
        left: 0,
        alignItems: 'center'
    },
    topOverlay: {
        top: 0,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    token: {
        padding: 8,
        backgroundColor: '#32cf9f',
        color: '#FFF',
        fontWeight: 'bold',
        width: 100,
        textAlign: 'center',
        borderRadius: 10,
        zIndex: 50
    }
});

export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            robotToken: null,
            deviceList: [],
            moveInstructions: {
                moveType:   null,
                direction:  null
            }
        };

        const socket = new Socket(`http://${CONFIG.socketServer.ipAddress}:${CONFIG.socketServer.port}`,
                                    { path: '/socket' });
        const usbs = new USBSerial();

        this.socket = socket;

        let me = this;

        async function writeAsync(value) {

            try {
                await usbs.writeAsync(value);
            } catch(err) {
                ToastAndroid.show(err.toString(), ToastAndroid.LONG);
            }
        }

        async function openDeviceByProductId(productId) {

            try {
                let device = await usbs.openDeviceByProductIdAsync(productId);

                console.log(device);

                me.setState({ deviceList: [device] });
            } catch(err) {
                ToastAndroid.show(err.toString(), ToastAndroid.LONG);
            }
        }

        function treatMovement(moveInstructions) {

            switch (moveInstructions.moveType) {
                case 'CAMERA':

                    // Treat movement for Camera
                    switch (moveInstructions.direction) {
                        case 'FOWARD':
                            writeAsync('W');
                            break;
                        case 'LEFT':
                            writeAsync('A');
                            break;
                        case 'RIGHT':
                            writeAsync('D');
                            break;
                        case 'BACK':
                            writeAsync('S');
                            break;
                    }
                    break;
                case 'MOTOR':

                    // Treat movement for Motor
                    switch (moveInstructions.direction) {
                        case 'FOWARD':
                            writeAsync('F');
                            break;
                        case 'LEFT':
                            writeAsync('L');
                            break;
                        case 'RIGHT':
                            writeAsync('R');
                            break;
                        case 'BACK':
                            writeAsync('B');
                            break;
                    }
                    break;
            }
        }

        function sendStop(command) {
            command = command || 'S';

            writeAsync(command);
        }

        socket.on('connect', () => {
            console.log('Socket connected');

            socket.emit('robotregister', { nickName: 'UmaUmaUmaE' });

            socket.on('robotregister:success', (robot) => {
                this.setState({ robotToken: robot[0].token });

                console.log('this.robotToken', this.state.robotToken);

                socket.on('robotstream:error', (err) => {
                    ToastAndroid.show(err.toString(), ToastAndroid.LONG);
                });

                socket.on('robotmove', (moveInstructions) => {
                    let mi = moveInstructions[0];

                    treatMovement(mi);

                    this.setState({ moveInstructions: mi });
                });

                socket.on('robotstop', (moveInstruction) => {
                    console.log('robotstop. command', moveInstruction.command);

                    sendStop(moveInstruction.command);
                });
            });
        });

        socket.on('error', (err) => {
            ToastAndroid.show(err.toString(), ToastAndroid.LONG);
        });

        socket.connect();

        openDeviceByProductId(67);
  }

  render() {
    return (
        <View style={styles.container}>
            <StatusBar animated hidden />

            <View style={[styles.overlay, styles.topOverlay]}>
                <Text style={styles.token}>
                    { this.state.robotToken }
                </Text>
            </View>

            <RTCCamera socket={this.socket} />
        </View>
    );
  }
}

AppRegistry.registerComponent('App', () => App);
