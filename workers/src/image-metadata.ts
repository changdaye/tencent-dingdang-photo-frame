function readUint16(data: DataView, offset: number, littleEndian = false) {
  return data.getUint16(offset, littleEndian);
}

export function readImageSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);

  if (view.byteLength >= 24 && view.getUint32(0) === 0x89504e47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (view.byteLength >= 30 && view.getUint32(0, true) === 0x46464952 && view.getUint32(8, true) === 0x50424557) {
    const chunk = view.getUint32(12, true);
    if (chunk === 0x20503856) {
      return { width: 1 + readUint16(view, 26, true), height: 1 + readUint16(view, 28, true) };
    }
  }

  if (view.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < view.byteLength) {
      if (view.getUint8(offset) != 0xff) break;
      const marker = view.getUint8(offset + 1);
      const length = readUint16(view, offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: readUint16(view, offset + 5), width: readUint16(view, offset + 7) };
      }
      offset += 2 + length;
    }
  }

  throw new Error('Unsupported image format');
}
