import {AppRegistry} from 'react-native';
import {widgetLiveTask} from './src/widget/widgetLiveTask';
import { registerRootComponent } from 'expo';

import App from './App';

AppRegistry.registerHeadlessTask('TfAssetWidgetLive',()=>widgetLiveTask);
registerRootComponent(App);
