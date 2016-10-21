import React, { Component } from 'react';
import {
    AppRegistry,
    Image,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
    ToastAndroid,
    Text,
    ScrollView,
    Dimensions
} from 'react-native';
import { RTCPeerConnection } from 'react-native-webrtc';

import Socket from 'react-native-socketio';
import UsbSerial from 'react-native-usbserial';
import Share from 'react-native-share';

import RTCCamera from './RTCCamera';
import ViewersList from './ViewersList';
import { getAppConfigs, showErrorToast } from '../util/utils';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection:      'column',
        backgroundColor:    '#262626',
        justifyContent:     'center',
        alignItems:         'center'
    },
    shareButton: {
        padding:            10,
        position:           'absolute',
        top:                0,
        right:              10,
        backgroundColor:    '#32cf9f',
        marginTop:          10,
        marginRight:        10,
        borderRadius:       50,
        zIndex:             50
    },
    deviceIcon: {
        backgroundColor:    '#32cf9f',
        padding:            10,
        borderRadius:       50,
        position:           'absolute',
        bottom:             10,
        right:              10,
        zIndex:             50
    },
    buttonImage: {
        width: 30,
        height: 30
    },
    stageContainer: {
        flex:           1,
        flexDirection:  'row',
        position:       'absolute',
        top:            0,
        left:           0,
        zIndex:         80
    },
    stageContainerItem: {
        flex: 1
    }
});

export default class App extends Component {
    constructor(props) {
        super(props);

        const dimension = Dimensions.get('window');

        this.state = {
            robot:          null,
            socket:         null,
            peerConnection: null,
            windowWidth:    dimension.width,
            windowHeight:   dimension.height,
            moveInstructions: {
                moveType:   null,
                direction:  null
            },
        };

        getAppConfigs().then((confs) => {
            this.CONFIGS = confs;

            const usbs = new UsbSerial();
            const socket = createSocketConnection(this.CONFIGS);
            const peerConnection = createPeerConnection(this.CONFIGS);

            this.setState({ socket: socket });
            this.setState({ peerConnection: peerConnection });

            this.usbs = usbs;

            this.connectToSocket();
            this.connectToRobotByUsbSerial();
        })
        .catch(showErrorToast);
    }

    connectToSocket() {
        const socket = this.state.socket;

        socket.on('connect', () => {

            socket.on('robot_register:success', (robot) => {
                this.robot = robot[0];

                // Listen robot move events
                socket.on('do_robot_movement', (moveInstructions) => {
                    const mi = moveInstructions[0];

                    this.setState({moveInstructions: mi});

                    const movementCmd = getMovementCommand(mi);

                    if (movementCmd)
                        this.sendRobotCommand(movementCmd);
                    else
                        showErrorToast('Received invalid move instructions');
                });

                socket.on('stop_robot', () => {
                    const stopCmd = 'S';

                    this.sendRobotCommand(stopCmd);
                });

                socket.on('get_robot_room_access:success', (obj) => {
                    this.shareAccessToken(obj[0].accessToken);
                });

                socket.on('get_robot_room_access:error', showErrorToast);
            });

            socket.on('robot_register:error', showErrorToast);

            socket.emit('robot_register', { nickName: 'BmateRobot' });
        });

        socket.on('error', showErrorToast);

        socket.connect();
    }

    connectToRobotByUsbSerial() {
        const me = this;

        async function getDeviceAsync(productId) {

            try {
                const deviceList = await me.usbs.getDeviceListAsync();

                const filteredDevList = deviceList.filter((dev) => {
                    return dev.productId == productId;
                });

                if (filteredDevList.length > 0) {
                    // Get the first device
                    const deviceObj = filteredDevList[0];
                    const usbSerialDevice = await me.usbs.openDeviceAsync(deviceObj);

                    if (usbSerialDevice)
                        me.setState({robot: usbSerialDevice});
                    else
                        showErrorToast('usbSerialDevice returned an empty entity');
                } else
                    showErrorToast('Nenhum robô conectado encontrado');

            } catch (err) {
                showErrorToast(err.toString());
            }
        }

        getDeviceAsync(67);
    }

    sendRobotCommand(command) {
        const robot = this.state.robot;

        async function _writeAsync(cmd) {

            try {
                await robot.writeAsync(cmd);
            } catch (err) {
                showErrorToast(err);
            }
        }

        if (robot) {
            _writeAsync(command);
        } else {
            showErrorToast('There is no device connected. Impossible write');
        }
    }

    get shareIcon() {
        return require('../assets/ic_screen_share_white_48dp.png');
    }

    get deviceIcon() {
        return require('../assets/ic_developer_board_white_48dp.png');
    }

    get getDeviceStateStyle() {

        if (this.state.robot) {
            return {};
        }

        return { backgroundColor: '#db4336' };
    }

    onClickShareButton() {

        if (this.isSocketConnected())
            this.state.socket.emit('get_robot_room_access', {});
    }

    onClickDeviceButton() {

        if (!this.state.robot)
            this.connectToRobotByUsbSerial();
    }

    shareAccessToken(accessToken) {
        const CONFIGS = this.CONFIGS;

        let transferProtocol;

        if (CONFIGS.useSecureServer) {
            transferProtocol = 'https';
        } else
            transferProtocol = 'http';

        const url = `${transferProtocol}://${CONFIGS.webApp.address}:${CONFIGS.webApp.port}/stage/#join/${accessToken}`;

        const robotAccessURL = {
            title: "Acesso à um robô Bmate",
            message: `Olá! Alguém compartilhou o acesso à um robô bmate com você!

Click no link para entrar na sala

`,
            url: url,
            subject: "Acesso a um Bmate",
            social: 'email'
        };

        Share.shareSingle(robotAccessURL);
    }

    isSocketConnected() {
        return this.state.socket.isConnected;
    }

    _renderCameraCast() {

        if (this.state.socket && this.state.peerConnection) {
            return (
                <View>
                    <View style={styles.stageContainer}>
                        <ViewersList
                            socket={this.state.socket}
                            peerConnection={this.state.peerConnection}
                        />
                    </View>

                    <RTCCamera
                        socket={this.state.socket}
                        peerConnection={this.state.peerConnection}
                        configs={this.CONFIGS}
                        style={{ width: this.state.windowWidth, height: this.state.windowHeight }}
                    />

                    <TouchableOpacity style={styles.shareButton} onPress={() => this.onClickShareButton()}>
                        <Image style={styles.buttonImage} source={this.shareIcon} />
                    </TouchableOpacity>
                </View>
            );
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <StatusBar animated hidden/>

                { this._renderCameraCast() }

                <TouchableOpacity
                    style={[styles.deviceIcon, this.getDeviceStateStyle]}
                    onPress={() => this.onClickDeviceButton()}
                >
                    <Image style={styles.buttonImage} source={this.deviceIcon} />
                </TouchableOpacity>

            </View>
        );
    }
}

function getMovementCommand(moveInstructions = {}) {

    switch (moveInstructions.moveType) {
        case 'CAMERA':

            // Treat movement for Camera
            switch (moveInstructions.direction) {
                case 'FOWARD':
                    return 'W';
                case 'LEFT':
                    return 'A';
                case 'RIGHT':
                    return 'D';
                case 'BACK':
                    return 'S';
            }
            break;
        case 'MOTOR':

            // Treat movement for Motor
            switch (moveInstructions.direction) {
                case 'FOWARD':
                    return 'F';
                case 'LEFT':
                    return 'L';
                case 'RIGHT':
                    return 'R';
                case 'BACK':
                    return 'B';
            }
            break;
    }
}

function createSocketConnection(CONFIGS) {
    let protocol;

    if (CONFIGS.useSecureServer) {
        protocol = 'https';
    } else {
        protocol = 'http';
    }

    const url = `${protocol}://${CONFIGS.socketServer.address}:${CONFIGS.socketServer.port}`;
    const socketOpts = {
        path: '/socket'
    };

    return new Socket(url, socketOpts);
}

function createPeerConnection(CONFIGS) {
    return new RTCPeerConnection(CONFIGS.webRTC);
}

AppRegistry.registerComponent('App', () => App);
