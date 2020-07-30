import {
  h, Host, Component, Prop, State, Watch,
} from '@stencil/core';
import { openPlayerWormhole } from '../../../core/player/PlayerWormhole';
import { PlayerProp, PlayerProps } from '../../../core/player/PlayerProp';
import { PlayerStateDispatcher, createPlayerStateDispatcher } from '../../../core/player/PlayerState';
import { TooltipDirection } from '../../tooltip/types';
import { Disposal } from '../../../core/player/Disposal';
import { findMyPlayer } from '../../../core/player/utils';
import { listen } from '../../../../utils/dom';

@Component({
  tag: 'vime-volume-control',
  styleUrl: 'volume-control.scss',
})
export class VolumeControl {
  private dispatch!: PlayerStateDispatcher;

  private keyboardDisposal = new Disposal();

  private prevMuted = false;

  private hideSliderTimeout?: number;

  @State() currentVolume = 50;

  @State() isSliderActive = false;

  /**
   * The URL to an SVG element or fragment.
   */
  @Prop() lowVolumeIcon = '#vime-volume-low';

  /**
   * The URL to an SVG element or fragment.
   */
  @Prop() highVolumeIcon = '#vime-volume-high';

  /**
   * The URL to an SVG element or fragment.
   */
  @Prop() mutedIcon = '#vime-volume-mute';

  /**
   * The direction in which the tooltip should grow.
   */
  @Prop() tooltipDirection: TooltipDirection;

  /**
   * Whether the tooltip should be hidden.
   */
  @Prop() hideTooltip = false;

  /**
   * A pipe (`|`) seperated string of JS key codes, that when caught in a `keydown` event, will
   * toggle the muted state of the player.
   */
  @Prop() muteKeyCodes?: string = '77';

  /**
   * If the `keyCodes` prop is provided, this prop can provide a hint to the user inside the
   * control tooltip, on what key presses will toggle the muted state of the player.
   */
  @Prop() muteKeyboardHint?: string = '(m)';

  /**
   * Prevents the volume being changed using the Up/Down arrow keys.
   */
  @Prop() noKeyboard = false;

  @Watch('noKeyboard')
  onNoKeyboardChange() {
    this.keyboardDisposal.empty();
    if (this.noKeyboard) return;
    const player = findMyPlayer(this);
    this.keyboardDisposal.add(listen(player, 'keydown', (event: Event) => {
      const { keyCode } = event as KeyboardEvent;
      if ((keyCode !== 38) && (keyCode !== 40)) return;
      const isUpArrow = (keyCode === 38);
      const newVolume = isUpArrow ? Math.min(100, this.volume + 5) : Math.max(0, this.volume - 5);
      this.dispatch(PlayerProp.Volume, parseInt(`${newVolume}`, 10));
    }));
  }

  /**
   * @internal
   */
  @Prop() muted: PlayerProps[PlayerProp.Muted] = false;

  /**
   * @internal
   */
  @Prop() volume: PlayerProps[PlayerProp.Volume] = 50;

  @Watch('muted')
  @Watch('volume')
  onPlayerVolumeChange() {
    this.currentVolume = this.muted ? 0 : this.volume;

    if (!this.muted && this.prevMuted && this.volume === 0) {
      this.dispatch(PlayerProp.Volume, 30);
    }

    this.prevMuted = this.muted;
  }

  /**
   * @internal
   */
  @Prop() isMobile: PlayerProps[PlayerProp.IsMobile] = false;

  /**
   * @internal
   */
  @Prop() i18n: PlayerProps[PlayerProp.I18N] = {};

  connectedCallback() {
    this.prevMuted = this.muted;
    this.dispatch = createPlayerStateDispatcher(this);
    this.onNoKeyboardChange();
  }

  disconnectedCallback() {
    this.keyboardDisposal.empty();
  }

  private onShowSlider() {
    clearTimeout(this.hideSliderTimeout);
    this.isSliderActive = true;
  }

  private onHideSlider() {
    this.hideSliderTimeout = setTimeout(() => {
      this.isSliderActive = false;
    }, 100) as any;
  }

  private onVolumeChange(event: CustomEvent<number>) {
    const newVolume = event.detail;
    this.currentVolume = newVolume;
    this.dispatch(PlayerProp.Volume, newVolume);
    this.dispatch(PlayerProp.Muted, newVolume === 0);
  }

  render() {
    return (
      <Host
        onMouseEnter={this.onShowSlider.bind(this)}
        onMouseLeave={this.onHideSlider.bind(this)}
      >
        <vime-mute-control
          keyCodes={this.muteKeyCodes}
          keyboardHint={this.muteKeyboardHint}
          lowVolumeIcon={this.lowVolumeIcon}
          highVolumeIcon={this.highVolumeIcon}
          mutedIcon={this.mutedIcon}
          tooltipDirection={this.tooltipDirection}
          hideTooltip={this.hideTooltip}
          onFocus={this.onShowSlider.bind(this)}
          onBlur={this.onHideSlider.bind(this)}
        />
        <vime-slider
          class={{
            hidden: this.isMobile,
            active: this.isSliderActive,
          }}
          step={5}
          max={100}
          value={this.currentVolume}
          label={this.i18n.volume}
          onFocus={this.onShowSlider.bind(this)}
          onBlur={this.onHideSlider.bind(this)}
          onValueChange={this.onVolumeChange.bind(this)}
        />
      </Host>
    );
  }
}

openPlayerWormhole(VolumeControl, [
  PlayerProp.Volume,
  PlayerProp.Muted,
  PlayerProp.IsMobile,
  PlayerProp.I18N,
]);
