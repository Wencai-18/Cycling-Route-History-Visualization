const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = process.argv[2] || ".";
const PORT = 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".fit": "application/octet-stream",
};

function buildHeaders(req) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://prod.zh.igpsport.com/",
    "Origin": "https://prod.zh.igpsport.com",
  };
  const token = req.headers["x-igpsport-token"] || "";
  if (token) {
    headers["Authorization"] = token.toLowerCase().startsWith("bearer ")
      ? token : "Bearer " + token;
  }
  const cookie = req.headers["x-igpsport-cookie"] || "";
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

function jsonReply(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(function(resolve) {
    var body = "";
    req.on("data", function(c) { body += c; });
    req.on("end", function() { resolve(body); });
  });
}

// Username/password login
async function handleLogin(req, res) {
  try {
    var body = await readBody(req);
    var creds = JSON.parse(body);
    var postData = JSON.stringify({
      username: creds.username,
      password: creds.password,
      appId: "igpsport-web"
    });

    var opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }
    };

    var loginReq = https.request("https://prod.zh.igpsport.com/service/auth/account/login", opts, function(loginRes) {
      var data = "";
      loginRes.on("data", function(c) { data += c; });
      loginRes.on("end", function() {
        try {
          var result = JSON.parse(data);
          if (result.code === 0 && result.data && result.data.access_token) {
            jsonReply(res, 200, {
              token: result.data.access_token,
              message: "登录成功"
            });
          } else {
            jsonReply(res, 401, {
              error: result.message || "登录失败"
            });
          }
        } catch(e) {
          jsonReply(res, 500, { error: "解析响应失败" });
        }
      });
    });

    loginReq.on("error", function(e) {
      jsonReply(res, 502, { error: "登录请求失败: " + e.message });
    });

    loginReq.write(postData);
    loginReq.end();
  } catch(e) {
    jsonReply(res, 400, { error: "请求格式错误" });
  }
}

function proxyRequest(req, res, targetPath) {
  var igpsportUrl = "https://prod.zh.igpsport.com" + targetPath;
  console.log("[proxy] " + req.method + " " + targetPath);

  var opts = { method: req.method, headers: buildHeaders(req) };

  var proxyReq = https.request(igpsportUrl, opts, function(proxyRes) {
    res.writeHead(proxyRes.statusCode, {
      "Content-Type": proxyRes.headers["content-type"] || "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    proxyRes.pipe(res);
  });

  proxyReq.on("error", function(e) {
    jsonReply(res, 502, { error: "Proxy error: " + e.message });
  });

  if (req.method === "POST") {
    readBody(req).then(function(body) {
      proxyReq.write(body);
      proxyReq.end();
    });
  } else {
    proxyReq.end();
  }
}

// Get download URL then download the FIT file
function downloadFIT(req, res, activityId) {
  var headers = buildHeaders(req);
  var token = headers["Authorization"] || "";

  // Step 1: Get download URL
  var getUrlPath = "/service/web-gateway/web-analyze/activity/getDownloadUrl/" + activityId;
  var urlOpts = { method: "GET", headers: headers };
  var urlReq = https.request("https://prod.zh.igpsport.com" + getUrlPath, urlOpts, function(urlRes) {
    var data = "";
    urlRes.on("data", function(c) { data += c; });
    urlRes.on("end", function() {
      try {
        var result = JSON.parse(data);
        if (result.code !== 0 || !result.data) {
          jsonReply(res, 404, { error: "获取下载链接失败: " + (result.message || "") });
          return;
        }

        var downloadUrl = result.data;
        // Step 2: Download the actual FIT file
        var dlHeaders = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        };
        if (token) dlHeaders["Authorization"] = token;

        https.get(downloadUrl, { headers: dlHeaders }, function(dlRes) {
          var disp = dlRes.headers["content-disposition"] || "";
          var fnameMatch = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          var fname = fnameMatch ? fnameMatch[1].replace(/['"]/g, "") : ("igpsport_" + activityId + ".fit");

          res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'attachment; filename="' + fname + '"',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
          });
          dlRes.pipe(res);
        }).on("error", function(e) {
          console.log("[download] Error fetching FIT:", e.message);
          // Fallback: try old endpoint
          var fallbackUrl = "https://prod.zh.igpsport.com/sport/record/exportFit?activityId=" + activityId;
          https.get(fallbackUrl, { headers: dlHeaders }, function(fbRes) {
            var fbDisp = fbRes.headers["content-disposition"] || "";
            var fbMatch = fbDisp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            var fbName = fbMatch ? fbMatch[1].replace(/['"]/g, "") : ("igpsport_" + activityId + ".fit");
            res.writeHead(200, {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": 'attachment; filename="' + fbName + '"',
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Expose-Headers": "Content-Disposition",
            });
            fbRes.pipe(res);
          }).on("error", function(e2) {
            jsonReply(res, 502, { error: "下载失败: " + e2.message });
          });
        });
      } catch(e) {
        jsonReply(res, 500, { error: "解析响应失败" });
      }
    });
  });

  urlReq.on("error", function(e) {
    jsonReply(res, 502, { error: "获取链接失败: " + e.message });
  });
  urlReq.end();
}

const server = http.createServer(async function(req, res) {
  var parsed = url.parse(req.url, true);
  var pathname = parsed.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });
    res.end();
    return;
  }

  // iGPSPORT login
  if (pathname === "/proxy/igpsport-login" && req.method === "POST") {
    handleLogin(req, res);
    return;
  }

  // iGPSPORT API proxy
  if (pathname.startsWith("/proxy/igpsport/")) {
    var targetPath = pathname.replace("/proxy/igpsport", "") + (parsed.search || "");
    proxyRequest(req, res, targetPath);
    return;
  }

  // iGPSPORT FIT download
  var fitMatch = pathname.match(/^\/proxy\/download-fit\/(\d+)/);
  if (fitMatch) {
    downloadFIT(req, res, fitMatch[1]);
    return;
  }

  // Static file serving
  var filePath = path.join(ROOT, pathname === "/" ? "/index.html" : pathname.split("?")[0]);
  console.log("[serve] " + req.method + " " + pathname + " -> " + filePath);
  fs.readFile(filePath, function(err, data) {
    if (err) {
      console.log("[serve] 404: " + filePath + " (" + err.code + ")");
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", function() {
  console.log("ROOT directory: " + ROOT);
  console.log("Server running at http://127.0.0.1:" + PORT);
  console.log("iGPSPORT proxy: /proxy/igpsport/*");
  console.log("Login endpoint: POST /proxy/igpsport-login");
});