import { useState, useRef, useEffect } from "react";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ImageIcon from "@mui/icons-material/Image";
import RestoreIcon from "@mui/icons-material/Restore";
import TitleIcon from "@mui/icons-material/Title";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import CollectionsIcon from "@mui/icons-material/Collections";
import PaletteIcon from "@mui/icons-material/Palette";
import { isSoundEnabled, setSoundEnabled } from "../../utils/soundSettings";
import GalleryImagePicker from "../common/GalleryImagePicker";
import { resolveImg } from "../../utils/imageSrc";
import { getAppTheme, setAppTheme, THEME_EVENT } from "../../utils/themeSettings";
import {
  applyFaviconUrl,
  getCachedFaviconUrl,
  loadFaviconUrl,
  saveFaviconUrl,
} from "../../utils/faviconSettings";
import { calcCompletionsForLevel, getHighestConfiguredLevel } from "../../utils/levelingRules";

const TITLE_KEY = "brave-todo:pageTitle";
const DEFAULT_TITLE = "Vanguard Hub";
const IS_DEV = import.meta.env.DEV;

// ── Page title hook ───────────────────────────────────────────
function usePageTitle() {
  const [title, setTitle] = useState(
    () => localStorage.getItem(TITLE_KEY) || document.title || DEFAULT_TITLE,
  );
  const [savedToDisk, setSavedToDisk] = useState(false);

  useEffect(() => {
    document.title = title;
    localStorage.setItem(TITLE_KEY, title);
  }, [title]);

  const saveTitle = async (newTitle) => {
    const t = newTitle.trim() || DEFAULT_TITLE;
    setTitle(t);
    setSavedToDisk(false);
    if (IS_DEV) {
      try {
        const res = await fetch("/api/save-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t }),
        });
        if (res.ok) setSavedToDisk(true);
      } catch {
        /* ignore */
      }
    }
  };

  const resetTitle = async () => {
    await saveTitle(DEFAULT_TITLE);
  };

  return { title, saveTitle, resetTitle, savedToDisk };
}

function drawImageAsFaviconDataUrl(img) {
  const canvasSize = 256;
  const padding = 20;
  const drawableSize = canvasSize - padding * 2;
  const scale = Math.min(drawableSize / img.width, drawableSize / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (canvasSize - width) / 2;
  const y = (canvasSize - height) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, width, height);
  return canvas.toDataURL("image/png");
}

// Convert any image file → PNG data URL (256px, suitable for favicon)
function fileToFaviconPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        resolve(drawImageAsFaviconDataUrl(img));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function imageSrcToFaviconPng(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      resolve(drawImageAsFaviconDataUrl(img));
    };
    img.src = resolveImg(src);
  });
}

function useFavicon() {
  const [faviconUrl, setFaviconUrl] = useState(
    () => getCachedFaviconUrl(),
  );
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    applyFaviconUrl(faviconUrl);
  }, [faviconUrl])

  useEffect(() => {
    let cancelled = false;

    loadFaviconUrl()
      .then((remoteFaviconUrl) => {
        if (!cancelled) setFaviconUrl(remoteFaviconUrl);
      })
      .catch(() => {
        if (!cancelled) setSaveError("讀取資料庫圖示失敗，已暫用本機快取。");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const uploadFavicon = async (file) => {
    if (!file) return;
    const dataUrl = await fileToFaviconPng(file);
    await saveFaviconDataUrl(dataUrl);
  };

  const uploadFaviconFromGallery = async (src) => {
    if (!src) return;
    const dataUrl = await imageSrcToFaviconPng(src);
    await saveFaviconDataUrl(dataUrl);
  };

  const saveFaviconDataUrl = async (dataUrl) => {
    setFaviconUrl(dataUrl);
    setSavedToDatabase(false);
    setSaveError("");

    try {
      await saveFaviconUrl(dataUrl);
      setSavedToDatabase(true);
    } catch {
      setSaveError("儲存到資料庫失敗，請稍後再試。");
    }
  };

  const resetFavicon = async () => {
    setFaviconUrl(null);
    setSavedToDatabase(false);
    setSaveError("");

    try {
      await saveFaviconUrl(null);
      setSavedToDatabase(true);
    } catch {
      setSaveError("恢復預設圖示失敗，請稍後再試。");
    }
  };

  return {
    faviconUrl,
    uploadFavicon,
    uploadFaviconFromGallery,
    resetFavicon,
    savedToDatabase,
    saveError,
  };
}

function SoundToggleCard() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-black m-0">音效設定</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            <VolumeUpIcon sx={{ fontSize: 20, color: "#a855f7" }} />
          ) : (
            <VolumeOffIcon sx={{ fontSize: 20, color: "#d1d5db" }} />
          )}
          <span className="text-sm text-gray-600">
            {enabled ? "音效已開啟" : "音效已關閉"}
          </span>
        </div>
        <Switch
          checked={enabled}
          onChange={toggle}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": { color: "#a855f7" },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              bgcolor: "#a855f7",
            },
          }}
        />
      </div>
      <p className="text-xs text-gray-400 m-0">控制任務完成音效與升級音效</p>
    </div>
  );
}

function ThemeSettingsCard() {
  const [theme, setTheme] = useState(getAppTheme);

  useEffect(() => {
    const handleThemeChange = (event) => setTheme(event.detail || getAppTheme());
    window.addEventListener(THEME_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_EVENT, handleThemeChange);
  }, []);

  const updateTheme = (nextTheme) => {
    setTheme(nextTheme);
    setAppTheme(nextTheme);
  };

  const themeOptions = [
    {
      key: "light",
      label: "白色",
      swatches: ["#ffffff", "#fafaf9", "#a855f7"],
    },
    {
      key: "retro",
      label: "美式復古",
      swatches: ["#e8d8c9", "#4b607f", "#f3701e"],
    },
    {
      key: "dark",
      label: "黑色",
      swatches: ["#111111", "#4b607f", "#f3701e"],
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-black m-0">外觀主題</p>
        <p className="text-xs text-gray-400 mt-0.5 m-0">
          保留預設白色，也可以切換成美式復古配色
        </p>
      </div>
      <div className="flex items-center gap-2">
        <PaletteIcon sx={{ fontSize: 20, color: "#a855f7" }} />
        <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-stone-50 p-1 gap-1">
          {themeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateTheme(option.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                theme === option.key
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span className="flex -space-x-1" aria-hidden="true">
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="block h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OtherSettings({
  currentLevel,
  levelingRules,
  onResetLevel,
}) {
  const maxLevel = getHighestConfiguredLevel(levelingRules);
  const [targetLevel, setTargetLevel] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const {
    faviconUrl,
    uploadFavicon,
    uploadFaviconFromGallery,
    resetFavicon,
    savedToDatabase: faviconSaved,
    saveError: faviconSaveError,
  } = useFavicon();
  const faviconInputRef = useRef(null);
  const [faviconGalleryOpen, setFaviconGalleryOpen] = useState(false);
  const {
    title: pageTitle,
    saveTitle,
    resetTitle,
    savedToDisk: titleSaved,
  } = usePageTitle();
  const [titleDraft, setTitleDraft] = useState(pageTitle);

  const handleInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setTargetLevel("");
      return;
    }
    setTargetLevel(Math.min(maxLevel, Math.max(1, val)));
    setConfirmed(false);
  };

  const handleReset = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    const completions = calcCompletionsForLevel(
      Number(targetLevel) || 1,
      levelingRules,
    );
    onResetLevel(completions);
    setConfirmed(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">其他設定</h2>
      </div>

      <ThemeSettingsCard />

      {/* Favicon card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">
            網頁圖示（Favicon）
          </p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            自訂瀏覽器分頁上顯示的小圖示，會同步儲存到資料庫
          </p>
          <p
            className="text-xs mt-1 m-0 font-medium"
            style={{ color: "#10b981" }}
          >
            ✓ 上傳後會寫入 Firestore，部署版也會自動載入
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0"
            style={
              faviconUrl ? { borderStyle: "solid", borderColor: "#a855f7" } : {}
            }
          >
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt="favicon"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon sx={{ fontSize: 22, color: "#d1d5db" }} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageIcon />}
                onClick={() => faviconInputRef.current?.click()}
                sx={{
                  borderColor: "#a855f7",
                  color: "#a855f7",
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  "&:hover": { borderColor: "#9333ea", bgcolor: "#faf5ff" },
                }}
              >
                上傳圖示
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CollectionsIcon />}
                onClick={() => setFaviconGalleryOpen(true)}
                sx={{
                  borderColor: "#a855f7",
                  color: "#a855f7",
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  "&:hover": { borderColor: "#9333ea", bgcolor: "#faf5ff" },
                }}
              >
                從圖庫選擇
              </Button>
              {faviconUrl && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<RestoreIcon />}
                  onClick={resetFavicon}
                  sx={{
                    color: "#9ca3af",
                    borderRadius: 99,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#f3f4f6" },
                  }}
                >
                  恢復預設
                </Button>
              )}
            </div>
            {faviconSaved && (
              <p
                className="text-xs m-0 font-medium"
                style={{ color: "#10b981" }}
              >
                ✓ 已儲存到資料庫
              </p>
            )}
            {faviconSaveError && (
              <p className="text-xs m-0 font-medium text-red-500">
                {faviconSaveError}
              </p>
            )}
          </div>
        </div>

        <input
          ref={faviconInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            uploadFavicon(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <GalleryImagePicker
          open={faviconGalleryOpen}
          onClose={() => setFaviconGalleryOpen(false)}
          initialTab="character"
          onSelect={uploadFaviconFromGallery}
        />
      </div>

      {/* Page title card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">網頁標題</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            瀏覽器分頁上顯示的標題文字
          </p>
          {IS_DEV ? (
            <p
              className="text-xs mt-1 m-0 font-medium"
              style={{ color: "#10b981" }}
            >
              ✓ 開發模式：儲存後會寫入 index.html，commit 後即永久生效
            </p>
          ) : (
            <p className="text-xs mt-1 m-0 font-medium text-amber-500">
              ⚠ 已部署模式：僅暫時更改（本裝置）。若要永久修改，請在本機操作後
              push。
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TitleIcon sx={{ color: "#d1d5db", fontSize: 20, shrink: 0 }} />
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle(titleDraft);
              }
              if (e.key === "Escape") setTitleDraft(pageTitle);
            }}
            className="flex-1 text-sm text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
            placeholder={DEFAULT_TITLE}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={() => saveTitle(titleDraft)}
            sx={{
              borderColor: "#a855f7",
              color: "#a855f7",
              borderRadius: 99,
              fontWeight: 600,
              fontSize: "0.75rem",
              textTransform: "none",
              "&:hover": { borderColor: "#9333ea", bgcolor: "#faf5ff" },
            }}
          >
            儲存標題
          </Button>
          {pageTitle !== DEFAULT_TITLE && (
            <Button
              variant="text"
              size="small"
              startIcon={<RestoreIcon />}
              onClick={() => {
                resetTitle();
                setTitleDraft(DEFAULT_TITLE);
              }}
              sx={{
                color: "#9ca3af",
                borderRadius: 99,
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                "&:hover": { bgcolor: "#f3f4f6" },
              }}
            >
              恢復預設
            </Button>
          )}
          {titleSaved && (
            <span className="text-xs font-medium" style={{ color: "#10b981" }}>
              ✓ 已寫入 index.html
            </span>
          )}
        </div>
      </div>

      {/* Level reset card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">等級重置</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            將目前等級重置到指定等級（目前 LV{currentLevel}）
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 shrink-0">重置到</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-mono text-gray-500">LV</span>
            <input
              type="number"
              min={1}
              max={maxLevel}
              value={targetLevel}
              onChange={handleInput}
              onFocus={() => setConfirmed(false)}
              className="w-20 text-sm font-bold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
            />
          </div>
          <span className="text-xs text-gray-400">（1 ~ {maxLevel}）</span>
        </div>

        {confirmed && (
          <p className="text-xs text-red-500 m-0">
            確定要重置到 LV{targetLevel} 嗎？再按一次確認。
          </p>
        )}

        <Button
          variant="contained"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          sx={{
            alignSelf: "flex-start",
            bgcolor: confirmed ? "#ef4444" : "#6b7280",
            borderRadius: 99,
            fontWeight: 600,
            fontSize: "0.8rem",
            textTransform: "none",
            px: 2.5,
            "&:hover": { bgcolor: confirmed ? "#dc2626" : "#4b5563" },
          }}
        >
          {confirmed ? "確認重置" : "重置等級"}
        </Button>
      </div>

      {/* Sound toggle card */}
      <SoundToggleCard />

    </div>
  );
}
