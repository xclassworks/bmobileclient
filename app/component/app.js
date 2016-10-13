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
import RTCCamera from './RTCCamera';
import ViewersList from './ViewersList';

import Socket from 'react-native-socketio';
import UsbSerial from 'react-native-usbserial';
import CONFIG from '../bconfig/configs.json';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection:      'column',
        backgroundColor:    '#ededed',
        justifyContent:     'center',
        alignItems:         'center'
    },
    shareButton: {
        padding:            10,
        position:           'absolute',
        top:                0,
        right:              10,
        backgroundColor:    '#262626',
        marginTop:          10,
        marginRight:        10,
        borderRadius:       50,
        zIndex:             50,
    },
    deviceIcon: {
        backgroundColor:    '#32cf9f',
        padding:            10,
        borderRadius:       50,
        position:           'absolute',
        bottom:             10,
        right:              10,
        zIndex:             50,
    },
    stageContainer: {
        flex:           1,
        flexDirection:  'row',
        position:       'absolute',
        zIndex:         10,
        top:            0,
        left:           0
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
            token: null,
            robotDevice: null,
            moveInstructions: {
                moveType:   null,
                direction:  null
            },
            windowWidth: dimension.width,
            windowHeight: dimension.height
        };

        const usbs = new UsbSerial();
        const socket = createSocketConnection();

        this.socket = socket;
        this.usbs = usbs;

        this.connectToSocket();
        this.connectToRobotByUsbSerial();
    }

    connectToSocket() {

        this.socket.on('connect', () => {
            console.log('Socket connected');

            this.socket.emit('robotregister', {nickName: 'Awesome first robot'});

            this.socket.on('robotregister:success', (robot) => {
                this.setState({token: robot[0].token});

                console.log('Token', this.state.token);

                this.socket.on('robotmove', (moveInstructions) => {
                    const mi = moveInstructions[0];

                    this.setState({moveInstructions: mi});

                    const movementCmd = getMovementCommand(mi);

                    if (movementCmd) {
                        this.sendRobotCommand(movementCmd);
                    } else {
                        showErrorToast('Received invalid move instructions');
                    }
                });

                this.socket.on('robotstop', (moveInstruction) => {
                    console.log('robotstop', moveInstruction.command);

                    const stopCmp = moveInstruction.command || 'S';

                    this.sendRobotCommand(stopCmp);
                });
            });
        });

        this.socket.on('error', (err) => {
            showErrorToast(err.toString());
        });

        this.socket.connect();
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
                    // Get the first
                    const deviceObj = filteredDevList[0];

                    let usbSerialDevice = await me.usbs.openDeviceAsync(deviceObj);

                    if (usbSerialDevice)
                        me.setState({robotDevice: usbSerialDevice});
                    else
                        showErrorToast('usbSerialDevice retured empty');
                } else
                    showErrorToast(`No device found in list with the productId ${productId}`);

            } catch (err) {
                showErrorToast(err.toString());
            }
        }

        getDeviceAsync(67);
    }

    sendRobotCommand(command) {

        async function _writeAsync(cmp) {

            try {
                await this.state.robotDevice.writeAsync();
            } catch (err) {
                showErrorToast(err.toString());
            }
        }

        if (this.state.robotDevice) {
            _writeAsync(command);
        } else {
            showErrorToast('There is no device connected. Impossible write');
        }
    }

    get shareIcon() {
        return require('../assets/ic_screen_share_white_36dp.png');
    }

    get deviceIcon() {
        return require('../assets/ic_developer_board_white_36dp.png');
    }

    get getDeviceStateStyle() {

        if (this.state.robotDevice) {
            return {};
        }

        return { backgroundColor: '#db4336' };
    }

    onClickShareButton() {
        console.log('in the onClickShareButton event');
    }

    render() {
        return (
            <View style={styles.container}>
                <StatusBar animated hidden/>

                <RTCCamera
                    socket={this.socket}
                    style={{ width: this.state.windowWidth, height: this.state.windowHeight }}
                />

                <View style={styles.stageContainer}>
                    <ViewersList socket={this.socket} />
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={this.onClickShareButton}>
                    <Image style={styles.buttonImage} source={this.shareIcon} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.deviceIcon, this.getDeviceStateStyle]}>
                    <Image style={styles.buttonImage} source={this.deviceIcon} />
                </TouchableOpacity>

            </View>
        );
    }
}

// <View style={[styles.overlay, styles.topOverlay]}>
//     <Text style={styles.token}>
//         { this.state.token }
//     </Text>
// </View>
// <RTCCamera socket={this.socket}/>


function showErrorToast(...strError) {

    if (strError.length > 0) {
        console.warn(strError.join(' '));

        ToastAndroid.show(strError.join(' '), ToastAndroid.LONG);
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

function createSocketConnection() {
    const url = `http://${CONFIG.socketServer.ipAddress}:${CONFIG.socketServer.port}`;
    const config = {
        path: '/socket'
    };

    return new Socket(url, config);
}

AppRegistry.registerComponent('App', () => App);
