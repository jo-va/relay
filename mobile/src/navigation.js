import React from 'react';
import PropTypes from 'prop-types';
import { Button, Text, Icon, Footer, FooterTab } from 'native-base';
import {
    NavigationActions,
    addNavigationHelpers,
    StackNavigator,
    TabNavigator
} from 'react-navigation';
import {
    createReduxBoundAddListener,
    createReactNavigationReduxMiddleware
} from 'react-navigation-redux-helpers';
import { connect } from 'react-redux';
import { REHYDRATE } from 'redux-persist';

import Main from './screens/main.screen';
import Map from './screens/map.screen';
import Join from './screens/join.screen';

import { LOGOUT } from './actions/constants';

// tabs in main screen
const MainScreenNavigation = TabNavigator({
    Main: { screen: Main },
    Map: { screen: Map }
}, {
    initialRouteName: 'Main',
    tabBarPosition: 'bottom',
    tabBarComponent: props => {
        return null;
        /*return (
            <Footer>
                <FooterTab>
                    <Button
                        vertical
                        active={props.navigationState.index === 0}
                        onPress={() => props.navigation.navigate('Main')}>
                        <Icon name='md-home' />
                        <Text>Distance</Text>
                    </Button>
                    <Button
                        vertical
                        active={props.navigationState.index === 1}
                        onPress={() => props.navigation.navigate('Map')}>
                        <Icon name='md-map' />
                        <Text>Map</Text>
                    </Button>
                </FooterTab>
            </Footer>                                 
        );*/
    }
});

const AppNavigator = StackNavigator({
    Main: {
        screen: MainScreenNavigation,
        navigationOptions: {
            header: null
        }
    },
    Join: { screen: Join }
}, {
    mode: 'modal'
});

// reducer initialization code
const initialState = AppNavigator.router.getStateForAction(
    NavigationActions.reset({
        index: 0,
        actions: [
            NavigationActions.navigate({
                routeName: 'Main'
            })
        ]
    })
);

export const navigationReducer = (state = initialState, action) => {
    let nextState = AppNavigator.router.getStateForAction(action, state);
    switch (action.type) {
        case REHYDRATE:
            // convert persisted data to Immutable and confirm rehydration
            const { payload = { } } = action;
            if (!payload.auth || !payload.jwt) {
                const { routes, index } = state;
                if (routes[index].routeName !== 'Join') {
                    nextState = AppNavigator.router.getStateForAction(
                        NavigationActions.navigate({ routeName: 'Join' }),
                        state
                    );
                }
            }
            break;
        case LOGOUT:
            const { routes, index } = state;
            if (routes[index].routeName !== 'Join') {
                nextState = AppNavigator.router.getStateForAction(
                    NavigationActions.navigate({ routeName: 'Join' }),
                    state
                );
            }
            break;
        default:
            nextState = AppNavigator.router.getStateForAction(action, state);
            break;
    }

    return nextState || state;
};

// Note: createcreateReactNavigationReduxMiddleware must be run before createReduxBoundAddListener
export const navigationMiddleware = createReactNavigationReduxMiddleware(
    'root',
    state => state.nav
);
const addListener = createReduxBoundAddListener('root');

class AppWithNavigationState extends React.Component {
    render() {
        return (
            <AppNavigator navigation={addNavigationHelpers({
                dispatch: this.props.dispatch,
                state: this.props.nav,
                addListener
            })} />
        );
    }
}

AppWithNavigationState.propTypes = {
    auth: PropTypes.shape({
        id: PropTypes.string,
        jwt: PropTypes.string
    }),
    dispatch: PropTypes.func.isRequired,
    nav: PropTypes.object.isRequired
};

const mapStateToProps = ({ auth, nav }) => ({
    auth,
    nav
});

export default connect(mapStateToProps)(AppWithNavigationState);
