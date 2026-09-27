// Independent decoration: no calculator state or input handlers are changed.
(() => {
    'use strict';
    const scene = document.querySelector('.cosmos');
    const canvas = scene.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, stars = [];
    let seed = 2718;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

    // Render the cloud texture once. Only its transform moves during animation.
    function makeNebula() {
        const texture = document.createElement('canvas');
        texture.width = innerWidth < 600 ? 480 : 960;
        texture.height = Math.round(texture.width * .68);
        const paint = texture.getContext('2d');
        if (!paint) return;
        const pixels = paint.createImageData(texture.width, texture.height);
        const grid = new Float32Array(256 * 256);
        for (let i = 0; i < grid.length; i++) grid[i] = random();
        const smooth = t => t * t * (3 - 2 * t);
        function noise(x, y) {
            const ix = Math.floor(x), iy = Math.floor(y);
            const fx = smooth(x - ix), fy = smooth(y - iy);
            const at = (a, b) => grid[(a & 255) + (b & 255) * 256];
            const a = at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx;
            const b = at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx;
            return a * (1 - fy) + b * fy;
        }
        for (let y = 0; y < texture.height; y++) {
            for (let x = 0; x < texture.width; x++) {
                const u = x / texture.width, v = y / texture.height;
                let cloud = 0, amplitude = .55, frequency = 4;
                for (let octave = 0; octave < 6; octave++) {
                    cloud += noise(u * frequency + 17, v * frequency + 39) * amplitude;
                    frequency *= 2; amplitude *= .5;
                }
                const ridge = v - (.83 - .63 * u) + (cloud - .5) * .55;
                const envelope = Math.exp(-ridge * ridge * 27);
                const density = Math.max(0, cloud - .28) * envelope;
                const filament = Math.pow(Math.max(0, cloud - .42) * 2.6, 2);
                const cyan = smooth(Math.min(1, Math.max(0, (u - .3) * 1.7)));
                const i = (y * texture.width + x) * 4;
                pixels.data[i] = (95 * (1 - cyan) + 22 * cyan) * density + filament * envelope * 70;
                pixels.data[i + 1] = (28 * (1 - cyan) + 112 * cyan) * density + filament * envelope * 75;
                pixels.data[i + 2] = 185 * density + filament * envelope * 110;
                pixels.data[i + 3] = 255;
            }
        }
        paint.putImageData(pixels, 0, 0);
        scene.querySelector('.nebula').style.backgroundImage = `url(${texture.toDataURL()})`;
    }

    function resize() {
        width = innerWidth; height = innerHeight;
        // Sharp up to 4K; cap total pixels and phone density to bound GPU work.
        const ratio = Math.min(devicePixelRatio || 1, width < 600 ? 2 : 3,
            Math.sqrt(8294400 / (width * height)));
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        seed = 921;
        stars = Array.from({ length: Math.min(700, Math.round(width * height / 2200) + 100) }, () => ({
            x: random() * width, y: random() * height,
            size: .35 + random() ** 3 * 1.5,
            phase: random() * Math.PI * 2,
            blue: random() > .75
        }));
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        for (const star of stars) {
            const x = star.x;
            const y = star.y;
            const alpha = .35 + .55 * (.5 + .5 * Math.sin(star.phase));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.blue ? '#a2d9ff' : '#e6e6ff';
            ctx.beginPath();
            ctx.arc(x, y, star.size, 0, Math.PI * 2);
            ctx.fill();
            if (star.size > 1.5) {
                ctx.globalAlpha = alpha * .22;
                ctx.fillRect(x - star.size * 3, y - .35, star.size * 6, .7);
                ctx.fillRect(x - .35, y - star.size * 3, .7, star.size * 6);
            }
        }
        ctx.globalAlpha = 1;
    }

    function updatePlayback() {
        scene.classList.toggle('is-paused', document.hidden || reducedMotion.matches);
    }

    makeNebula();
    resize();
    updatePlayback();
    let resizeFrame;
    addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(resize);
    });
    document.addEventListener('visibilitychange', updatePlayback);
    reducedMotion.addEventListener('change', updatePlayback);
})();
