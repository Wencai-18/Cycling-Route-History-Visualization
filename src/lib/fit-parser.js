// fit-parser.js v4 — robust FIT binary parser
var FITParser = (function() {
  var S2D = 180 / 2147483648, EPOCH = 631065600;

  function parseFITFile(file, color) {
    return file.arrayBuffer().then(function(buf) {
      var dv = new DataView(buf), off = 14;
      if (dv.getUint8(0) === 12) off = 12;
      var dsz = dv.getUint32(4, true), end = Math.min(off + dsz, buf.byteLength);
      var defs = {}, recs = [], sessTs = null;

      while (off < end - 1) {
        if (off + 6 >= dv.byteLength) break;
        var hdr = dv.getUint8(off++);
        if (hdr & 0x80) { off += 2; continue; }
        var ln = hdr & 0x0F;

        if (hdr & 0x40) {
          off++; var arch = dv.getUint8(off++);
          var b0 = dv.getUint8(off), b1 = dv.getUint8(off+1);
          var gn = arch ? (b1 + b0*256) : (b0 + b1*256);
          if (gn > 1000) gn = arch ? (b0 + b1*256) : (b1 + b0*256);
          off += 2;
          var nf = dv.getUint8(off++);
          if (off + nf * 3 > dv.byteLength) break;
          var fields = [];
          for (var i = 0; i < nf; i++) {
            fields.push({ n: dv.getUint8(off), s: dv.getUint8(off+1), t: dv.getUint8(off+2) & 0x1F });
            off += 3;
          }
          if (hdr & 0x20) { var nd = dv.getUint8(off++); off += nd * 3; }
          defs[ln] = { gn: gn, fs: fields };
        } else {
          var def = defs[ln];
          if (!def) continue;
          // Compute total size from declared field sizes
          var sz = 0;
          for (var i = 0; i < def.fs.length; i++) sz += def.fs[i].s;
          if (off + sz > dv.byteLength) break;
          var data = {};
          for (var i = 0; i < def.fs.length; i++) {
            var f = def.fs[i], v = null, p = off;
            switch (f.t) {
              case 0: case 2: case 10: case 13: v = dv.getUint8(p); break;
              case 1: v = dv.getInt8(p); break;
              case 3: v = dv.getInt16(p, true); break;
              case 4: case 11: v = dv.getUint16(p, true); break;
              case 5: v = dv.getInt32(p, true); break;
              case 6: case 12: case 14: v = dv.getUint32(p, true); break;
              case 8: v = dv.getFloat32(p, true); break;
              case 9: v = dv.getFloat64(p, true); break;
            }
            data[f.n] = v;
            off += f.s;
          }
          if (def.gn === 20 && data[0] != null && data[1] != null) {
            var la = data[0], lo = data[1];
            if (la < 0x7FFFFFFF && lo < 0x7FFFFFFF && la > -0x80000000 && lo > -0x80000000) {
              var rla = la * S2D, rlo = lo * S2D;
              var prev = recs[recs.length - 1];
              if (!prev || hdist([prev.lng, prev.lat], [rlo, rla]) < 500000) {
                if (data[253] == null || data[253] > 946684800) {
                  recs.push({ lat: rla, lng: rlo, alt: (data[2] != null && data[2] < 65535) ? data[2] : null, ts: data[253] });
                }
              }
            }
          }
          if (def.gn === 18 && data[253] != null) sessTs = data[253];
        }
      }

      if (recs.length === 0) {
        var di = Object.keys(defs).map(function(k) { return 'local=' + k + ' global=' + defs[k].gn; }).join(', ');
        throw new Error('FIT 文件中未找到 GPS 轨迹数据 (消息定义: ' + di + ')');
      }

      var coords = [], elevs = [];
      for (var i = 0; i < recs.length; i++) { coords.push([recs[i].lng, recs[i].lat]); elevs.push(recs[i].alt); }
      var dist = 0;
      for (var i = 1; i < coords.length; i++) dist += hdist(coords[i-1], coords[i]);
      var dur = 0;
      if (recs.length >= 2) {
        var fts = recs[0].ts, lts = recs[recs.length-1].ts;
        if (fts != null && lts != null && lts > fts) dur = lts - fts;
      }
      if (!dur) dur = dist / 5.5 * 3600;
      var ele = 0;
      for (var i = 1; i < elevs.length; i++) {
        if (elevs[i] != null && elevs[i-1] != null) { var d = elevs[i]-elevs[i-1]; if (d>0&&d<100) ele+=d; }
      }
      var spd = dur > 0 ? (dist/1000)/(dur/3600) : 0;
      var dt = sessTs ? new Date((sessTs+EPOCH)*1000).toISOString() : new Date().toISOString();
      return {
        name: file.name.replace(/\.fit$/i,''), date: dt, distance: Math.round(dist),
        duration: dur, avgSpeed: Math.round(spd*10)/10, elevation: Math.round(ele),
        routeGeoJSON: { type:'FeatureCollection', features:[{ type:'Feature', geometry:{ type:'LineString', coordinates:coords }, properties:{} }] },
        color:color, source:'file', stravaId:null, elevations: elevs.filter(function(e){return e!=null;}),
      };
    });
  }

  function hdist(a, b) {
    var R=6371000, tr=function(d){return d*Math.PI/180;};
    var dLa=tr(b[1]-a[1]), dLo=tr(b[0]-a[0]), la1=tr(a[1]), la2=tr(b[1]);
    var sLa=Math.sin(dLa/2), sLo=Math.sin(dLo/2);
    var h=sLa*sLa+Math.cos(la1)*Math.cos(la2)*sLo*sLo;
    return 2*R*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  return { parseFITFile: parseFITFile };
})();