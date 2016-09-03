/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    ListView,
    NativeModules
} from 'react-native';

import Socket from 'react-native-socketio';

const SOCKET_IP_ADDRESS = '192.168.1.45';
const SOCKET_PORT = 8989;

let socket = new Socket(`http://${SOCKET_IP_ADDRESS}:${SOCKET_PORT}`, { path: '/socket' });

socket.on('connect', () => {
    console.log('Socket connected');

    socket.emit('robotregister', { nickName: 'UmaUmaUmaE' });

    socket.on('robotregister:success', (robot) => {
        console.log('Robot', robot);

        setInterval(function () {
            socket.emit('robotstream', { token: robot.token, buffer: 'asdn1H820UDAS-buffer-LOKO' });
        }, 2000);
    });
});

socket.connect();

class bmobileclient extends Component {
    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 != r2
        });

        this.state = {
            dataSource: ds.cloneWithRows([
                'John', 'Joel', 'James', 'Jimmy', 'Jackson'
            ])
        };
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.welcome}>
                    Bmate
                </Text>
                <Text style={styles.instructions}>
                    Keeping people in touch
                </Text>
                <ListView dataSource={this.state.dataSource}
                    renderRow={(rowData) => <Text>{ rowData }</Text>}
                />
            </View>
    );
  }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
});

AppRegistry.registerComponent('bmobileclient', () => bmobileclient);
