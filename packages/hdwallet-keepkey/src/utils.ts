import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@shapeshiftoss/hdwallet-core";

export const SEGMENT_SIZE = 63;

// Shim until this exists for jspb https://github.com/protocolbuffers/protobuf/issues/1591
export function protoFieldToSetMethod(fieldName: string): string {
  return `set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
}

// https://gist.github.com/joni/3760795/8f0c1a608b7f0c8b3978db68105c5b1d741d0446
export function toUTF8Array(str: string): Uint8Array {
  var utf8: Array<number> = [];
  for (var i = 0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
    // surrogate pair
    else {
      i++;
      charcode = ((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff);
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

export function translateInputScriptType(scriptType: core.BTCScriptType): any {
  switch (scriptType) {
    case core.BTCScriptType.KeyHash:
      return Types.InputScriptType.SPENDADDRESS;
    case core.BTCScriptType.ScriptHash:
      return Types.InputScriptType.SPENDMULTISIG;
    case core.BTCScriptType.ScriptHashWitness:
      return Types.InputScriptType.SPENDP2SHWITNESS;
    case core.BTCScriptType.Witness:
      return Types.InputScriptType.SPENDWITNESS;
  }
  throw new Error("unhandled InputSriptType enum: " + scriptType);
}

export function translateOutputScriptType(scriptType: core.BTCScriptType): any {
  switch (scriptType) {
    case core.BTCScriptType.KeyHash:
      return Types.OutputScriptType.PAYTOADDRESS;
    case core.BTCScriptType.ScriptHash:
      return Types.OutputScriptType.PAYTOMULTISIG;
    case core.BTCScriptType.ScriptHashWitness:
      return Types.OutputScriptType.PAYTOP2SHWITNESS;
    case core.BTCScriptType.Witness:
      return Types.OutputScriptType.PAYTOWITNESS;
  }
  throw new Error("unhandled OutputScriptType enum: " + scriptType);
}
