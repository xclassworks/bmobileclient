import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    ListView,
    NativeModules
} from 'react-native';

import CameraStage from './app/component/camera-stage';

class bmobileclient extends Component {

    render() {
        return (
            <CameraStage />
        );
    }
}

AppRegistry.registerComponent('bmobileclient', () => bmobileclient);
