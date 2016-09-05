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

import Camera from 'react-native-camera';
import Socket from 'react-native-socketio';
import USBSerial from 'react-native-usbserial';

import CONFIG from '../config';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    padding: 16,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  topOverlay: {
    top: 0,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textOverlay: {
    flex: 0.3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  textOverlayText: {
    flex: 1,
    flexDirection: 'row',
  },
  bottomOverlay: {
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 40,
  },
  typeButton: {
    padding: 5,
  },
  flashButton: {
    padding: 5,
  },
  buttonsSpace: {
    width: 10
  },
  colorInOverlay: {
      color: '#FFFFFF'
  }
});

export default class CameraStage extends Component {
  constructor(props) {
    super(props);

    this.camera = null;

    this.state = {
      camera: {
        aspect: Camera.constants.Aspect.fill,
        captureTarget: Camera.constants.CaptureTarget.cameraRoll,
        type: Camera.constants.Type.front,
        orientation: Camera.constants.Orientation.auto,
        flashMode: Camera.constants.FlashMode.auto,
      },
      isRecording: false,
      robotToken: null,
      moveInstructions: {
          moveType: null,
          direction: null
      },
      deviceList: []
    };

    this.takePicture = this.takePicture.bind(this);
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.switchType = this.switchType.bind(this);
    this.switchFlash = this.switchFlash.bind(this);

    let socket = new Socket(`http://${CONFIG.SOCKET_IP_ADDRESS}:${CONFIG.SOCKET_PORT}`, { path: '/socket' });
    var usbs = new USBSerial();

    async function writeAsync(value) {

        try {
            await usbs.writeAsync(value);
        } catch(err) {
            ToastAndroid.show(err.toString(), ToastAndroid.LONG);
        }
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

                console.log(mi);

                if (mi.moveType == 'MOTOR' && mi.direction == 'FOWARD') {
                    writeAsync('M');
                }

                this.setState({ moveInstructions: mi });
            });
        });
    });

    socket.connect();

    var me = this;

    async function openDeviceByProductId(productId) {

        try {
            let device = await usbs.openDeviceByProductIdAsync(productId);

            console.log(device);

            me.setState({ deviceList: [device] });
        } catch(err) {
            ToastAndroid.show(err.toString(), ToastAndroid.LONG);
        }
    }

    openDeviceByProductId(67);
  }

  takePicture() {
    if (this.camera) {
      this.camera.capture()
        .then((data) => console.log(data))
        .catch(err => console.error(err));
    }
  }

  startRecording() {
    if (this.camera) {
      this.camera.capture({mode: Camera.constants.CaptureMode.video})
          .then((data) => console.log(data))
          .catch(err => console.error(err));
      this.setState({
        isRecording: true
      });
    }
  }

  stopRecording() {
    if (this.camera) {
      this.camera.stopCapture();
      this.setState({
        isRecording: false
      });
    }
  }

  switchType() {
    let newType;
    const { back, front } = Camera.constants.Type;

    if (this.state.camera.type === back) {
      newType = front;
    } else if (this.state.camera.type === front) {
      newType = back;
    }

    this.setState({
      camera: {
        ...this.state.camera,
        type: newType,
      },
    });
  }

  get typeIcon() {
    let icon;
    const { back, front } = Camera.constants.Type;

    if (this.state.camera.type === back) {
      icon = require('../assets/ic_camera_rear_white.png');
    } else if (this.state.camera.type === front) {
      icon = require('../assets/ic_camera_front_white.png');
    }

    return icon;
  }

  switchFlash() {
    let newFlashMode;
    const { auto, on, off } = Camera.constants.FlashMode;

    if (this.state.camera.flashMode === auto) {
      newFlashMode = on;
    } else if (this.state.camera.flashMode === on) {
      newFlashMode = off;
    } else if (this.state.camera.flashMode === off) {
      newFlashMode = auto;
    }

    this.setState({
      camera: {
        ...this.state.camera,
        flashMode: newFlashMode,
      },
    });
  }

  get flashIcon() {
    let icon;
    const { auto, on, off } = Camera.constants.FlashMode;

    if (this.state.camera.flashMode === auto) {
      icon = require('../assets/ic_flash_auto_white.png');
    } else if (this.state.camera.flashMode === on) {
      icon = require('../assets/ic_flash_on_white.png');
    } else if (this.state.camera.flashMode === off) {
      icon = require('../assets/ic_flash_off_white.png');
    }

    return icon;
  }

  render() {
    return (
        <View style={styles.container}>

            <StatusBar animated hidden />

            <Camera
              ref={(cam) => {
                this.camera = cam;
              }}
              style={styles.preview}
              aspect={this.state.camera.aspect}
              captureTarget={this.state.camera.captureTarget}
              type={this.state.camera.type}
              flashMode={this.state.camera.flashMode}
              defaultTouchToFocus />

            <View style={[styles.overlay, styles.topOverlay]}>
              <TouchableOpacity
                style={styles.typeButton}
                onPress={this.switchType}>
                <Image source={this.typeIcon} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flashButton}
                onPress={this.switchFlash}>
                <Image source={this.flashIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.textOverlay}>
                <Text style={styles.textOverlayText}>Token: { this.state.robotToken }</Text>
                <Text style={styles.textOverlayText}>
                    Move type: { this.state.moveInstructions.moveType }
                </Text>
                <Text style={styles.textOverlayText}>
                    Movement direction: { this.state.moveInstructions.direction }
                </Text>
            </View>

            <View style={styles.textOverlay}>
                {
                    this.state.deviceList.map((device) => {
                        return <Text style={styles.textOverlayText}>name: {device.name} productId: {device.productId} deviceName: {device.deviceName}</Text>
                    })
                }
            </View>

        </View>
    );
  }
}

AppRegistry.registerComponent('CameraStage', () => CameraStage);
