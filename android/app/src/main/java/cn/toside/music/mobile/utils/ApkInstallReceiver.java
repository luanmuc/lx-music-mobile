package cn.toside.music.mobile.utils;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.File;

/**
 * 在线更新安装包清理接收器。
 * 系统安装/升级完成本应用（package:com.luanmuc.lxmusic）后，会发出受保护的系统广播
 * ACTION_PACKAGE_ADDED / ACTION_PACKAGE_REPLACED（即使本应用进程已被终止，系统也会拉起本接收器）。
 * 收到后删除 installApk 时记录的 APK 文件，避免安装包残留在公共下载目录。
 */
public class ApkInstallReceiver extends BroadcastReceiver {
  private static final String PREFS_NAME = "apk_install";
  private static final String KEY_PATH = "installApkPath";

  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();
    if (action == null) return;
    if (!Intent.ACTION_PACKAGE_ADDED.equals(action) && !Intent.ACTION_PACKAGE_REPLACED.equals(action)) return;

    // 仅处理本应用自身的安装/升级完成广播（data 形如 package:com.luanmuc.lxmusic）
    String pkg = intent.getData() != null ? intent.getData().getSchemeSpecificPart() : null;
    if (pkg == null || !pkg.equals(context.getPackageName())) return;

    SharedPreferences sp = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String path = sp.getString(KEY_PATH, null);
    if (path == null || path.length() == 0) return;

    try {
      File f = new File(path);
      if (f.exists()) {
        boolean ok = f.delete();
        Log.i("ApkInstallReceiver", "delete apk " + (ok ? "ok" : "failed") + ": " + path);
      } else {
        Log.i("ApkInstallReceiver", "apk already gone: " + path);
      }
    } catch (Exception e) {
      Log.e("ApkInstallReceiver", "delete apk error", e);
    } finally {
      sp.edit().remove(KEY_PATH).apply();
    }
  }
}
