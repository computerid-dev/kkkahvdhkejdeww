import { Capacitor, registerPlugin } from '@capacitor/core';

interface SaveFilePlugin {
  saveText(options: {
    fileName: string;
    mimeType: string;
    data: string;
  }): Promise<{ uri: string }>;
}

const SaveFile = registerPlugin<SaveFilePlugin>('SaveFile');

export type SaveResult = 'saved' | 'canceled';

function downloadViaAnchor(fileName: string, mimeType: string, data: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Simpan teks ke file. Di APK: membuka file manager Android supaya pengguna
 * memilih lokasi. Di browser desktop: dialog "Simpan sebagai" bila didukung,
 * kalau tidak, unduh biasa.
 * Mengembalikan 'canceled' bila pengguna menutup dialog tanpa menyimpan.
 */
export async function saveTextFile(
  fileName: string,
  data: string,
  mimeType = 'application/json',
): Promise<SaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SaveFile.saveText({ fileName, mimeType, data });
      return 'saved';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
      if (msg === 'CANCELED') return 'canceled';
      throw err;
    }
  }

  const picker = (window as unknown as {
    showSaveFilePicker?: (o: unknown) => Promise<{
      createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
    }>;
  }).showSaveFilePicker;

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [{ description: 'File backup JSON', accept: { [mimeType]: ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([data], { type: mimeType }));
      await writable.close();
      return 'saved';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'canceled';
      // picker gagal karena alasan lain -> coba unduh biasa
    }
  }

  downloadViaAnchor(fileName, mimeType, data);
  return 'saved';
}
