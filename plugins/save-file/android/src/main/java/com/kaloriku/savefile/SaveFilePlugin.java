package com.kaloriku.savefile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Membuka file manager Android (ACTION_CREATE_DOCUMENT) supaya pengguna
 * memilih folder dan nama file, lalu menulis teks ke lokasi itu.
 */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {

    @PluginMethod
    public void saveText(PluginCall call) {
        String fileName = call.getString("fileName", "backup.json");
        String mimeType = call.getString("mimeType", "application/json");
        String data = call.getString("data");

        if (data == null) {
            call.reject("Data kosong.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("CANCELED");
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("Lokasi file tidak valid.");
            return;
        }

        String data = call.getString("data", "");
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) {
                call.reject("Tidak bisa menulis ke lokasi yang dipilih.");
                return;
            }
            out.write(data.getBytes(StandardCharsets.UTF_8));
            out.flush();
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal menyimpan file: " + e.getMessage());
        }
    }
}
