import React, { Component } from 'react';
import {
    ListView,
    ScrollView,
    View,
    Text,
    Image
} from 'react-native';
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

        this.state = {
            viewers: [
                {id: 2, name: 'bixo'},
                {id: 3, name: 'Olha a fera ai'},
                {id: 4, name: 'Olha a fera ai'},
                {id: 5, name: 'Olha a fera ai'}
            ]
        };
    }
    
    _renderRow(viewer) {
        return (
            <View style={styles.viewer}>
                <Image
                    style={styles.viewerStage}
                    source={{ uri: "http://media.salon.com/2014/12/bojack_horseman2.jpg" }}
                />
            </View>
        );
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
