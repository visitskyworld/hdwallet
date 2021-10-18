import Portis from "@portis/web3";
import * as core from "@shapeshiftoss/hdwallet-core";

import { PortisHDWallet } from "./portis";

type PortisWallet = any;

const INACTIVITY_LOGOUT_TIME = 10 * 60 * 1000;

export class PortisAdapter {
  keyring: core.Keyring;
  portis: any;
  portisAppId: string;

  /// wallet id to remove from the keyring when the active wallet changes
  currentDeviceId?: string;

  private constructor(keyring: core.Keyring, args: { portis?: PortisWallet; portisAppId: string }) {
    this.portis = args.portis;
    this.portisAppId = args.portisAppId;
    this.keyring = keyring;
  }

  public static useKeyring(keyring: core.Keyring, args: { portis?: PortisWallet; portisAppId: string }) {
    return new PortisAdapter(keyring, args);
  }

  public async pairDevice(): Promise<PortisHDWallet> {
    try {
      const wallet = await this.initialize();
      this.portis.onActiveWalletChanged(async (wallAddr: string) => {
        // check if currentDeviceId has changed
        const walletAddress = "portis:" + wallAddr;
        if (!this.currentDeviceId || walletAddress.toLowerCase() !== this.currentDeviceId.toLowerCase()) {
          const currentDeviceId = this.currentDeviceId;
          if (currentDeviceId) {
            this.keyring.delete(currentDeviceId);
          }
          await this.initialize();
        }
      });
      this.portis.onLogout(() => {
        const currentDeviceId = this.currentDeviceId;
        if (!currentDeviceId) return;
        this.keyring.delete(currentDeviceId);
      });
      return wallet;
    } catch (e) {
      if (core.isIndexable(e) && String(e.message).includes("User denied login.")) {
        throw new core.ActionCancelled();
      }
      throw e;
    }
  }

  private async initialize(): Promise<PortisHDWallet> {
    this.portis = new Portis(this.portisAppId, "mainnet");
    const wallet = new PortisHDWallet(this.portis);
    await wallet.initialize();
    const deviceId = await wallet.getDeviceID();
    await this.keyring.add(wallet, deviceId);
    this.currentDeviceId = deviceId;

    const watchForInactivity = () => {
      let time: ReturnType<typeof setTimeout>;
      const resetTimer = () => {
        clearTimeout(time);
        time = setTimeout(() => {
          window.onload = null;
          document.onmousemove = null;
          document.onkeypress = null;
          clearTimeout(time);
          this.portis.logout();
        }, INACTIVITY_LOGOUT_TIME);
      };
      window.onload = resetTimer;
      document.onmousemove = resetTimer;
      document.onkeypress = resetTimer;
      resetTimer();
    };

    watchForInactivity();
    return wallet;
  }
}
