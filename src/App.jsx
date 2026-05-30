import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const defaultSettings = {
  grayscale: false,
  inverted: false,
  brightness: 0,
  contrast: 0,
};

const productPreset = {
  grayscale: false,
  inverted: false,
  brightness: 18,
  contrast: 34,
};

const nightPreset = {
  grayscale: false,
  inverted: false,
  brightness: 32,
  contrast: 24,
};

function clampChannel(value) {
  return Math.max(0, Math.min(255, value));
}

function processPixels(imageData, settings) {
  const data = imageData.data;
  const contrastFactor =
    (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];

    if (settings.grayscale) {
      const gray = red * 0.299 + green * 0.587 + blue * 0.114;
      red = gray;
      green = gray;
      blue = gray;
    }

    red = contrastFactor * (red - 128) + 128 + settings.brightness;
    green = contrastFactor * (green - 128) + 128 + settings.brightness;
    blue = contrastFactor * (blue - 128) + 128 + settings.brightness;

    if (settings.inverted) {
      red = 255 - red;
      green = 255 - green;
      blue = 255 - blue;
    }

    data[index] = clampChannel(red);
    data[index + 1] = clampChannel(green);
    data[index + 2] = clampChannel(blue);
  }

  return imageData;
}

export default function App() {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('请选择 JPG 或 PNG 图片开始处理。');
  const [hasImage, setHasImage] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [viewMode, setViewMode] = useState('effect');

  const renderCanvas = useCallback((canvas, shouldProcess) => {
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    const context = canvas.getContext('2d', { willReadFrequently: true });
    const maxCanvasWidth = 1280;
    const scale = Math.min(1, maxCanvasWidth / image.naturalWidth);
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    if (shouldProcess) {
      const imageData = context.getImageData(0, 0, width, height);
      context.putImageData(processPixels(imageData, settings), 0, 0);
    }
  }, [settings]);

  const drawImage = useCallback(() => {
    renderCanvas(canvasRef.current, viewMode === 'effect');
  }, [renderCanvas, viewMode]);

  useEffect(() => {
    if (hasImage) {
      drawImage();
    }
  }, [drawImage, hasImage]);

  function loadImageElement(image, name) {
    imageRef.current = image;
    setFileName(name);
    setSettings(defaultSettings);
    setViewMode('effect');
    setHasImage(true);
    setStatus('图片已加载，请使用下方控件调整效果。');
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setStatus('仅支持 JPG 和 PNG 图片。');
      event.target.value = '';
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      loadImageElement(image, file.name);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus('图片加载失败，请尝试其他 JPG 或 PNG 图片。');
    };

    image.src = url;
  }

  function loadSampleImage() {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 360;
    sampleCanvas.height = 240;
    const context = sampleCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 360, 240);
    gradient.addColorStop(0, '#22d3ee');
    gradient.addColorStop(0.5, '#a3e635');
    gradient.addColorStop(1, '#f43f5e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 360, 240);
    context.fillStyle = 'rgb(7 11 19 / 0.72)';
    context.fillRect(44, 42, 272, 156);
    context.fillStyle = '#ecfeff';
    context.font = '700 34px system-ui, sans-serif';
    context.fillText('CANVAS', 92, 116);
    context.font = '600 20px system-ui, sans-serif';
    context.fillText('练习图片', 126, 150);

    const image = new Image();
    image.onload = () => loadImageElement(image, '练习图片.png');
    image.src = sampleCanvas.toDataURL('image/png');
  }

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setViewMode('effect');
  }

  function applyPreset(nextSettings, message) {
    if (!hasImage) {
      setStatus('请先上传图片或使用示例图片。');
      return;
    }

    setSettings(nextSettings);
    setViewMode('effect');
    setStatus(message);
  }

  function resetImage() {
    setSettings(defaultSettings);
    setViewMode('effect');
    setStatus(hasImage ? '图片已重置为原始效果。' : status);
  }

  function downloadImage() {
    if (!hasImage) {
      setStatus('请先上传图片再下载。');
      return;
    }

    const outputCanvas = document.createElement('canvas');
    renderCanvas(outputCanvas, true);

    const link = document.createElement('a');
    const baseName = fileName.replace(/\.[^.]+$/, '') || '处理后的图片';
    link.download = `${baseName}-处理后.png`;
    link.href = outputCanvas.toDataURL('image/png');
    link.click();
    setStatus('处理后的图片已下载为 PNG。');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="signal">canvas-image-lab</p>
          <h1>Canvas 图片处理练习</h1>
        </div>
        <span className="status-dot" aria-label="就绪" />
      </header>

      <section className="workspace" aria-label="图像画布工作区">
        <label className="upload-zone">
          <input
            accept="image/jpeg,image/png"
            className="file-input"
            data-testid="file-input"
            onChange={handleUpload}
            type="file"
          />
          <span className="upload-icon">+</span>
          <span className="upload-title">上传图片</span>
          <span className="upload-copy">{fileName || '点击选择 JPG 或 PNG 图片'}</span>
        </label>

        <div className="quick-actions">
          <button className="sample-button" onClick={loadSampleImage} type="button">
            示例图片
          </button>
          <button
            className={viewMode === 'original' ? 'view-button is-active' : 'view-button'}
            disabled={!hasImage}
            onClick={() => setViewMode('original')}
            type="button"
          >
            查看原图
          </button>
          <button
            className={viewMode === 'effect' ? 'view-button is-active' : 'view-button'}
            disabled={!hasImage}
            onClick={() => setViewMode('effect')}
            type="button"
          >
            查看效果图
          </button>
        </div>

        <div className="canvas-frame">
          {!hasImage && (
            <div className="empty-state">
              <span className="scanline" />
              <p>画布预览待命</p>
            </div>
          )}
          <canvas
            aria-label={viewMode === 'original' ? '原图预览' : '处理后的图片预览'}
            className={hasImage ? 'image-canvas is-visible' : 'image-canvas'}
            ref={canvasRef}
          />
        </div>
      </section>

      <section className="controls" aria-label="图像处理控件">
        <div className="preset-grid">
          <button
            disabled={!hasImage}
            onClick={() => applyPreset(productPreset, '已应用产品图增强。')}
            type="button"
          >
            产品图增强
          </button>
          <button
            disabled={!hasImage}
            onClick={() => applyPreset(nightPreset, '已应用夜景增强。')}
            type="button"
          >
            夜景增强
          </button>
        </div>

        <div className="control-row">
          <label htmlFor="brightness">亮度</label>
          <output>{settings.brightness}</output>
        </div>
        <input
          disabled={!hasImage}
          id="brightness"
          max="100"
          min="-100"
          onChange={(event) => updateSetting('brightness', Number(event.target.value))}
          onInput={(event) => updateSetting('brightness', Number(event.target.value))}
          type="range"
          value={settings.brightness}
        />

        <div className="control-row">
          <label htmlFor="contrast">对比度</label>
          <output>{settings.contrast}</output>
        </div>
        <input
          disabled={!hasImage}
          id="contrast"
          max="100"
          min="-100"
          onChange={(event) => updateSetting('contrast', Number(event.target.value))}
          onInput={(event) => updateSetting('contrast', Number(event.target.value))}
          type="range"
          value={settings.contrast}
        />

        <div className="toggle-grid">
          <label className="toggle-card">
            <input
              checked={settings.grayscale}
              disabled={!hasImage}
              onChange={(event) => updateSetting('grayscale', event.target.checked)}
              type="checkbox"
            />
            <span>灰度化</span>
          </label>
          <label className="toggle-card">
            <input
              checked={settings.inverted}
              disabled={!hasImage}
              onChange={(event) => updateSetting('inverted', event.target.checked)}
              type="checkbox"
            />
            <span>反色</span>
          </label>
        </div>

        <div className="action-grid">
          <button disabled={!hasImage} onClick={resetImage} type="button">
            重置
          </button>
          <button disabled={!hasImage} onClick={downloadImage} type="button">
            下载图片
          </button>
        </div>

        <p className="status-line" role="status">
          {status}
        </p>
      </section>
    </main>
  );
}
