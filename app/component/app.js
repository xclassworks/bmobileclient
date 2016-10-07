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
import UsbSerial from 'react-native-usbserial';
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
            token: null,
            robotDevice: null,
            moveInstructions: {
                moveType:   null,
                direction:  null
            }
        };

        const usbs = new UsbSerial();
        const socket = new Socket(`http://${CONFIG.socketServer.ipAddress}:${CONFIG.socketServer.port}`,
                                    { path: '/socket' });

        this.socket = socket;
        this.usbs = usbs;

        this.connectToSocket();
        this.connectToRobotByUsbSerial();
    }

  connectToSocket() {

      this.socket.on('connect', () => {
          console.log('Socket connected');

          socket.emit('robotregister', { nickName: 'Awesome first robot' });

          socket.on('robotregister:success', (robot) => {
              this.setState({ token: robot[0].token });

              console.log('Token', this.state.token);

              socket.on('robotmove', (moveInstructions) => {
                  const mi = moveInstructions[0];

                  this.setState({ moveInstructions: mi });

                  const movementCmd = getMovementCommand(mi);

                  if (movementCmd) {
                      this.sendRobotCommand(movementCmd);
                  } else {
                      showErrorToast('Received invalid move instructions');
                  }
              });

              socket.on('robotstop', (moveInstruction) => {
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
                      me.setState({ robotDevice: usbSerialDevice });
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

  render() {
    return (
        <View style={styles.container}>
            <StatusBar animated hidden />

            <View style={[styles.overlay, styles.topOverlay]}>
                <Text style={styles.token}>
                    { this.state.token }
                </Text>
            </View>

            <RTCCamera socket={this.socket} />
        </View>
    );
  }
}

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

AppRegistry.registerComponent('App', () => App);
