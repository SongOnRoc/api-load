import i18n from "@/locales";

/**
 * 通过创建临时 <a> 标签触发浏览器下载。
 * 用于导出密钥、日志等需要鉴权的文件下载场景。
 *
 * @param url 完整的下载 URL（含 query string）
 * @param filename 下载文件名
 * @returns 是否成功触发下载（鉴权失败时返回 false 并提示）
 */
export function downloadViaAnchor(url: string, filename: string): boolean {
  const authKey = localStorage.getItem("authKey");
  if (!authKey) {
    window.$message.error(i18n.global.t("auth.noAuthKeyFound"));
    return false;
  }

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * 把对象参数拼成 URLSearchParams，自动过滤 undefined/null/空字符串，并附加鉴权 key。
 */
export function buildAuthQuery(
  params: Record<string, string | number | undefined | null>,
  baseUrl: string
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  }
  const authKey = localStorage.getItem("authKey");
  if (authKey) {
    query.append("key", authKey);
  }
  return `${baseUrl}?${query.toString()}`;
}
