import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {resolveSystemProfitColors} from '../settings/systemColorPalette';
import {colors} from './tokens';

/** Subscribe on render; never freeze financial colors in a module-level StyleSheet. */
export function useSystemColors(){
  const palette=resolveSystemProfitColors(useSettingsRuntime().prefs.display);
  return {...colors,gain:palette.gainColor,loss:palette.lossColor,flat:palette.neutralColor};
}
