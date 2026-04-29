// P1ERA Mesh Gradient Shader — vanilla WebGL, no deps.
// Animates a smooth multi-color mesh in the brand palette.
(function () {
  const VERT = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Domain-warped, multi-color mesh blend.
  const FRAG = `
    precision highp float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform vec2  u_res;
    uniform float u_speed;
    uniform vec3  u_c0;
    uniform vec3  u_c1;
    uniform vec3  u_c2;
    uniform vec3  u_c3;
    uniform vec3  u_c4;
    uniform float u_grain;

    // Hash + value noise
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i+vec2(1.0,0.0));
      float c = hash(i+vec2(0.0,1.0));
      float d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.5;
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = v_uv;
      vec2 p = uv * vec2(u_res.x/u_res.y, 1.0);
      float t = u_time * u_speed;

      // Domain warp for organic mesh motion
      vec2 q = vec2(fbm(p + vec2(0.0, t*0.15)),
                    fbm(p + vec2(5.2, t*0.12 + 1.3)));
      vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2) + t*0.10),
                    fbm(p + 4.0*q + vec2(8.3, 2.8) - t*0.08));
      float n = fbm(p + 4.0*r);

      // Five color stops blended by noise + position
      float w0 = smoothstep(0.0, 0.55, 1.0 - length(uv - vec2(0.15,0.85)) * 1.4);
      float w1 = smoothstep(0.0, 0.65, 1.0 - length(uv - vec2(0.85,0.15)) * 1.3);
      float w2 = smoothstep(0.0, 0.7,  1.0 - length(uv - vec2(0.5,0.5))   * 1.1);
      float w3 = smoothstep(0.0, 0.6,  1.0 - length(uv - vec2(0.9,0.9))   * 1.4);
      float w4 = smoothstep(0.0, 0.55, 1.0 - length(uv - vec2(0.1,0.1))   * 1.4);

      // Modulate weights by warped noise
      w0 *= 0.6 + 0.8 * n;
      w1 *= 0.4 + 0.9 * (1.0 - n);
      w2 *= 0.5 + 0.7 * fbm(p*1.4 + t*0.07);
      w3 *= 0.4 + 0.8 * r.x;
      w4 *= 0.4 + 0.8 * r.y;

      vec3 col = u_c0 * w0 + u_c1 * w1 + u_c2 * w2 + u_c3 * w3 + u_c4 * w4;
      float wsum = max(w0+w1+w2+w3+w4, 0.001);
      col /= wsum;

      // Tiny dithering grain to fight banding
      float g = (hash(gl_FragCoord.xy + t*60.0) - 0.5) * u_grain;
      col += g;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[shader] compile failed:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function hexToRgb(hex) {
    const h = hex.replace("#","");
    return [
      parseInt(h.substr(0,2), 16) / 255,
      parseInt(h.substr(2,2), 16) / 255,
      parseInt(h.substr(4,2), 16) / 255,
    ];
  }

  function init(canvas, opts) {
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(135deg,#4F0C28,#7A1E35,#6B1E3E)";
      return null;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[shader] link failed:", gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1, -1,1,
      -1, 1,  1,-1,  1,1
    ]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      time:  gl.getUniformLocation(prog, "u_time"),
      res:   gl.getUniformLocation(prog, "u_res"),
      speed: gl.getUniformLocation(prog, "u_speed"),
      c0:    gl.getUniformLocation(prog, "u_c0"),
      c1:    gl.getUniformLocation(prog, "u_c1"),
      c2:    gl.getUniformLocation(prog, "u_c2"),
      c3:    gl.getUniformLocation(prog, "u_c3"),
      c4:    gl.getUniformLocation(prog, "u_c4"),
      grain: gl.getUniformLocation(prog, "u_grain"),
    };

    function applyColors(colors) {
      gl.uniform3fv(u.c0, hexToRgb(colors[0]));
      gl.uniform3fv(u.c1, hexToRgb(colors[1]));
      gl.uniform3fv(u.c2, hexToRgb(colors[2]));
      gl.uniform3fv(u.c3, hexToRgb(colors[3]));
      gl.uniform3fv(u.c4, hexToRgb(colors[4]));
    }
    applyColors(opts.colors);
    gl.uniform1f(u.speed, opts.speed || 0.25);
    gl.uniform1f(u.grain, opts.grain || 0.015);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth | 0;
      const h = canvas.clientHeight | 0;
      const cw = Math.max(1, (w * dpr) | 0);
      const ch = Math.max(1, (h * dpr) | 0);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw; canvas.height = ch;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf, start = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      const t = (now - start) / 1000;
      gl.uniform1f(u.time, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Pause when off-screen / tab hidden for perf
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !running) {
          running = true; start = performance.now() - (gl.getUniform(prog, u.time) || 0) * 1000;
          raf = requestAnimationFrame(frame);
        } else if (!e.isIntersecting && running) {
          running = false; cancelAnimationFrame(raf);
        }
      });
    });
    io.observe(canvas);

    return {
      setColors: applyColors,
      destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); }
    };
  }

  // P1ERA palettes
  const PALETTES = {
    dark:  ["#1A0510", "#4F0C28", "#7A1E35", "#6B1E3E", "#8A9AD4"],
    light: ["#F4EFEA", "#E8ECF9", "#C5D2F8", "#8A9AD4", "#7A1E35"],
  };

  window.P1ERAShader = {
    mount(canvas, theme) {
      return init(canvas, { colors: PALETTES[theme] || PALETTES.dark, speed: 0.22, grain: 0.012 });
    },
    palette(theme) { return PALETTES[theme] || PALETTES.dark; },
  };
})();
