import { ToastAndroid } from 'react-native';

const getAppConfigs = () => {
    // return fetch('http://bmate.com.br/configs')
    //         .then((response) => response.json());
    return fetch('http://192.168.1.45/configs')
            .then((response) => {
                return response.json();
            });
};

const showErrorToast = (...errors) => {

    if (errors.length > 0) {
        const strMessageArray = errors.map((err) => {

            console.log(err);

            if (typeof err != 'string')
                return err.toString();

            return err;
        });

        ToastAndroid.show(strMessageArray.join(' '), ToastAndroid.LONG);
    }
};

export { getAppConfigs, showErrorToast };
