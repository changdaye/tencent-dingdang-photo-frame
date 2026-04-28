function readUint16(data: DataView, offset: number, littleEndian = false) {
  return data.getUint16(offset, littleEndian);
}

export function readImageSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);

  // PNG
  if (view.getUint32(0) === 0x89504e47) {
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  // JPEG
  if (view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const length = readUint16(view, offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: readUint16(view, offset + 5),
          width: readUint16(view, offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  throw new Error('Unsupported image format');
}
