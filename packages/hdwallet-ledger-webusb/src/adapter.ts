import * as core from "@shapeshiftoss/hdwallet-core";
import * as ledger from "@shapeshiftoss/hdwallet-ledger";

import { LedgerWebUsbTransport, getFirstLedgerDevice, getTransport, openTransport } from "./transport";

const VENDOR_ID = 11415;
const APP_NAVIGATION_DELAY = 3000;

export class WebUSBLedgerAdapter {
  keyring: core.Keyring;
  currentEventTimestamp: number = 0;

  constructor(keyring: core.Keyring) {
    this.keyring = keyring;

    if (window && window.navigator.usb) {
      window.navigator.usb.addEventListener("connect", this.handleConnectWebUSBLedger.bind(this));
      window.navigator.usb.addEventListener("disconnect", this.handleDisconnectWebUSBLedger.bind(this));
    }
  }

  public static useKeyring(keyring: core.Keyring) {
    return new WebUSBLedgerAdapter(keyring);
  }

  private async handleConnectWebUSBLedger(e: USBConnectionEvent): Promise<void> {
    if (e.device.vendorId !== VENDOR_ID) return;
    this.currentEventTimestamp = Date.now();
  
    await this.initialize(e.device);
  }

  private async handleDisconnectWebUSBLedger(e: USBConnectionEvent): Promise<void> {
    if (e.device.vendorId !== VENDOR_ID) return;

    const ts = Date.now();
    this.currentEventTimestamp = ts;

    // timeout gives time to detect if it is an app navigation based disconnect/connect event
    // discard disconnect event if it is not the most recent event received
    setTimeout(async () => {
      if (ts !== this.currentEventTimestamp) return;

      try {
        if (e.device.serialNumber) await this.keyring.delete(e.device.serialNumber);
      } catch (e) {
        console.error(e);
      }
    }, APP_NAVIGATION_DELAY);
  }

  public get(device: USBDevice): core.HDWallet {
    return core.mustBeDefined(this.keyring.get(device.serialNumber));
  }

  // without unique device identifiers, we should only ever have one ledger device on the keyring at a time
  private async initialize(device: USBDevice): Promise<ledger.LedgerHDWallet> {
    await this.keyring.delete(core.mustBeDefined(device.serialNumber));

    const ledgerTransport = await openTransport(device);

    const wallet = ledger.create(new LedgerWebUsbTransport(device, ledgerTransport, this.keyring));

    await this.keyring.add(wallet, device.serialNumber);

    return wallet
  }

  public async pairDevice(usbDevice?: USBDevice): Promise<ledger.LedgerHDWallet> {
    const device = usbDevice ?? (await getTransport()).device ?? (await getFirstLedgerDevice());

    const wallet = await this.initialize(device);

    return core.mustBeDefined(wallet);
  }
}
