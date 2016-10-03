import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    ListView,
    NativeModules
} from 'react-native';

import App from './app/component/app';

class bmobileclient extends Component {

    render() {
        return (
            <App />
        );
    }
}

AppRegistry.registerComponent('bmobileclient', () => bmobileclient);
