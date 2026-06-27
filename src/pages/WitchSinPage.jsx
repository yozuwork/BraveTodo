import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ForestRoundedIcon from "@mui/icons-material/ForestRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import defaultAvatar from "../assets/hero.jpg";
import useQuests from "../hooks/useQuests";
import useLevelingRules from "../hooks/useLevelingRules";
import useCharacter from "../hooks/useCharacter";
import useStages, { resolveCurrentStage } from "../hooks/useStages";
import "./WitchSinPage.css";

const STORE_ITEMS = [
  { id: "coffee", icon: "☕", name: "咖啡休息券", description: "放心休息 20 分鐘，喝杯喜歡的飲料。", cost: 30 },
  { id: "game", icon: "🎮", name: "遊戲時光", description: "兌換 30 分鐘沒有罪惡感的遊戲時間。", cost: 60 },
  { id: "comic", icon: "📚", name: "漫畫補給", description: "買一本漫畫或存入下一本漫畫基金。", cost: 120 },
  { id: "dessert", icon: "🍰", name: "甜點補給", description: "挑一份喜歡的甜點，給今天蓋一枚甜甜的章。", cost: 80 },
  { id: "movie", icon: "🎬", name: "電影之夜", description: "安排一個舒服的晚上，只負責沉進故事裡。", cost: 150 },
  { id: "freehalf", icon: "🌙", name: "半日自由券", description: "預留半天，不排工作，只做真正想做的事。", cost: 300 },
];

const STORAGE_KEYS = {
  spentGold: "witchSinSpentGold",
  redeemHistory: "witchSinRedeemHistory",
};

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredValue(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeReward(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (Number.isNaN(parsed)) return 10;
  return Math.min(999, Math.max(1, parsed));
}

function StatMetric({ label, value, bonus }) {
  return (
    <div className="witch-stat-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>+{bonus}</em>
    </div>
  );
}

function SideNavButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`witch-side-nav__button ${active ? "is-active" : ""}`}
    >
      <span className="witch-side-nav__icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function QuestRow({ quest, onToggle, onRemove }) {
  const reward = quest.expValue ?? 1;

  return (
    <article className={`witch-quest-row ${quest.completed ? "is-complete" : ""}`}>
      <button
        type="button"
        onClick={() => onToggle(quest.id)}
        className={`witch-quest-row__check ${quest.completed ? "is-complete" : ""}`}
        aria-label={quest.completed ? "取消完成任務" : "完成任務"}
      >
        {quest.completed && <CheckRoundedIcon sx={{ fontSize: 20 }} />}
      </button>

      <div className="witch-quest-row__content">
        <h3>{quest.text}</h3>
        <p>{quest.completed ? "今天已經完成這件事了。" : "等待出發"}</p>
      </div>

      <div className="witch-quest-row__actions">
        <span className="witch-quest-row__reward">✦ {reward}</span>
        <button
          type="button"
          onClick={() => onRemove(quest.id)}
          className="witch-quest-row__remove"
          aria-label="刪除任務"
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </article>
  );
}

function RewardCard({ item, affordable, onRedeem }) {
  return (
    <article className="witch-reward-card">
      <div className="witch-reward-card__glow" />
      <div className="witch-reward-card__icon">{item.icon}</div>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <div className="witch-reward-card__footer">
        <span>✦ {item.cost}</span>
        <button
          type="button"
          onClick={() => onRedeem(item)}
          disabled={!affordable}
        >
          {affordable ? "兌換" : "不足"}
        </button>
      </div>
    </article>
  );
}

export default function WitchSinPage() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskDraft, setTaskDraft] = useState("");
  const [rewardDraft, setRewardDraft] = useState("10");
  const [spentGold, setSpentGold] = useState(() =>
    readStoredValue(STORAGE_KEYS.spentGold, 0)
  );
  const [redeemHistory, setRedeemHistory] = useState(() =>
    readStoredValue(STORAGE_KEYS.redeemHistory, [])
  );

  const {
    quests,
    addQuest,
    toggleQuest,
    removeQuest,
    clearCompleted,
    lifetimeCompletions,
    coreTaskCompleted,
    loaded: questsLoaded,
  } = useQuests();
  const { rules: levelingRules } = useLevelingRules();
  const { stages, loaded: stagesLoaded } = useStages();
  const { level, expProgress, coreTaskProgress, stats, imagePosition } = useCharacter(
    lifetimeCompletions,
    coreTaskCompleted,
    levelingRules
  );

  const currentStage = useMemo(
    () => resolveCurrentStage(stages, level),
    [level, stages]
  );

  const travellerAvatar = currentStage?.avatarSrc ?? defaultAvatar;
  const availableGold = Math.max(0, lifetimeCompletions - spentGold);
  const completedCount = quests.filter((quest) => quest.completed).length;
  const totalCount = quests.length;

  const sortedQuests = useMemo(
    () =>
      [...quests].sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        return Number(b.id) - Number(a.id);
      }),
    [quests]
  );

  useEffect(() => {
    saveStoredValue(STORAGE_KEYS.spentGold, spentGold);
  }, [spentGold]);

  useEffect(() => {
    saveStoredValue(STORAGE_KEYS.redeemHistory, redeemHistory);
  }, [redeemHistory]);

  const handleAddTask = (event) => {
    event.preventDefault();

    const trimmed = taskDraft.trim();
    if (!trimmed) return;

    addQuest(trimmed, { expValue: normalizeReward(rewardDraft) });
    setTaskDraft("");
  };

  const handleRedeem = (item) => {
    if (availableGold < item.cost) return;

    setSpentGold((value) => value + item.cost);
    setRedeemHistory((items) => [
      { id: item.id, cost: item.cost, createdAt: Date.now() },
      ...items,
    ]);
  };

  if (!questsLoaded || !stagesLoaded) {
    return (
      <main className="witch-page">
        <div className="witch-loading">載入魔女的原罪中...</div>
      </main>
    );
  }

  return (
    <main className="witch-page">
      <div className="witch-page__texture" />

      <div className="witch-shell">
        <header className="witch-hero">
          <div className="witch-hero__content">
            <Link to="/" className="witch-hero__back">
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
              返回主入口
            </Link>
            <div className="witch-hero__title-row">
              <div className="witch-hero__badge">
                <ForestRoundedIcon sx={{ fontSize: 26 }} />
              </div>
              <div>
                <h1>魔女的原罪</h1>
                <p>完成今日的小冒險，慢慢把想要的獎勵一點一點帶回家。</p>
              </div>
            </div>
          </div>

          <div className="witch-hero__coins">
            <span className="witch-hero__coin-mark">✦</span>
            <strong>{availableGold}</strong>
            <small>金幣</small>
          </div>
        </header>

        <div className="witch-board">
          <aside className="witch-sidebar">
            <section className="witch-traveller-card">
              <div className="witch-traveller-card__avatar">
                <img
                  src={travellerAvatar}
                  alt={currentStage?.className ?? "角色頭貼"}
                  onError={(event) => {
                    event.currentTarget.src = defaultAvatar;
                  }}
                  style={{
                    objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  }}
                />
              </div>
              <span className="witch-traveller-card__eyebrow">TRAVELLER</span>
              <h2>柚子的旅程</h2>
              <div className="witch-traveller-card__progress">
                <div className="witch-traveller-card__progress-head">
                  <span>今日進度</span>
                  <strong>
                    {completedCount} / {Math.max(totalCount, 1)}
                  </strong>
                </div>
                <div className="witch-traveller-card__track">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        totalCount ? (completedCount / totalCount) * 100 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            <nav className="witch-side-nav">
              <SideNavButton
                active={activeTab === "tasks"}
                icon={<TaskAltRoundedIcon sx={{ fontSize: 22 }} />}
                label="任務清單"
                onClick={() => setActiveTab("tasks")}
              />
              <SideNavButton
                active={activeTab === "shop"}
                icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 22 }} />}
                label="獎勵商店"
                onClick={() => setActiveTab("shop")}
              />
              <SideNavButton
                active={activeTab === "character"}
                icon={<PersonRoundedIcon sx={{ fontSize: 22 }} />}
                label="人物介面"
                onClick={() => setActiveTab("character")}
              />
            </nav>

            <p className="witch-sidebar__hint">
              任務完成時會得到金幣與經驗值。
              <br />
              取消完成則會扣回該筆獎勵與進度。
            </p>
          </aside>

          <section className="witch-content">
            {activeTab === "tasks" && (
              <>
                <div className="witch-content__header">
                  <div>
                    <h2>今日任務</h2>
                    <p>每一件小事，都是往山丘另一側走的一步。</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCompleted}
                    className="witch-content__ghost-button"
                  >
                    清除已完成
                  </button>
                </div>

                <form className="witch-task-form" onSubmit={handleAddTask}>
                  <input
                    value={taskDraft}
                    onChange={(event) => setTaskDraft(event.target.value)}
                    placeholder="輸入一個任務，例如：整理桌面 10 分鐘"
                  />
                  <input
                    value={rewardDraft}
                    onChange={(event) => setRewardDraft(event.target.value)}
                    inputMode="numeric"
                    className="is-reward"
                    aria-label="獎勵點數"
                  />
                  <button type="submit">
                    <AddRoundedIcon sx={{ fontSize: 20 }} />
                    新增任務
                  </button>
                </form>

                <div className="witch-quest-list">
                  {sortedQuests.length > 0 ? (
                    sortedQuests.map((quest) => (
                      <QuestRow
                        key={quest.id}
                        quest={quest}
                        onToggle={toggleQuest}
                        onRemove={removeQuest}
                      />
                    ))
                  ) : (
                    <div className="witch-empty-state">
                      <strong>還沒有任務</strong>
                      <p>先寫下一件今天想做好的小事，這裡就會開始長出你的旅程。</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "shop" && (
              <>
                <div className="witch-content__header">
                  <div>
                    <h2>獎勵商店</h2>
                    <p>把努力變成可以看見、可以兌換的小禮物。</p>
                  </div>
                </div>

                <div className="witch-reward-grid">
                  {STORE_ITEMS.map((item) => (
                    <RewardCard
                      key={item.id}
                      item={item}
                      affordable={availableGold >= item.cost}
                      onRedeem={handleRedeem}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab === "character" && (
              <>
                <div className="witch-content__header">
                  <div>
                    <h2>人物介面</h2>
                    <p>像遊戲一樣看見自己的成長，努力會累積成能力值。</p>
                  </div>
                </div>

                <div className="witch-character-layout">
                  <div className="witch-character-portrait">
                    <div className="witch-character-portrait__badge">LEVEL {level}</div>
                    <img
                      src={travellerAvatar}
                      alt={currentStage?.className ?? "旅程角色"}
                      onError={(event) => {
                        event.currentTarget.src = defaultAvatar;
                      }}
                      style={{
                        objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                      }}
                    />
                    <div className="witch-character-portrait__note">
                      這張頭像會和人物介面同步
                    </div>
                  </div>

                  <div className="witch-character-stats">
                    <div className="witch-character-stats__headline">
                      <div className="witch-character-stats__avatar">
                        <img
                          src={travellerAvatar}
                          alt={currentStage?.className ?? "角色頭貼"}
                          onError={(event) => {
                            event.currentTarget.src = defaultAvatar;
                          }}
                          style={{
                            objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                          }}
                        />
                      </div>
                      <div>
                        <h3>{currentStage?.className ?? "初心者"}</h3>
                        <p>Lv.{level}</p>
                      </div>
                    </div>

                    <div className="witch-character-stats__progress-block">
                      <span>經驗值</span>
                      <div className="witch-progress-bar">
                        <span style={{ width: `${expProgress}%` }} />
                      </div>
                    </div>

                    <div className="witch-character-stats__progress-block">
                      <span>核心任務經驗條</span>
                      <div className="witch-progress-bar is-secondary">
                        <span style={{ width: `${coreTaskProgress}%` }} />
                      </div>
                    </div>

                    <div className="witch-character-stats__metrics">
                      <StatMetric label="攻擊" value={stats.atk.value} bonus={stats.atk.bonus} />
                      <StatMetric label="防禦" value={stats.def.value} bonus={stats.def.bonus} />
                      <StatMetric label="敏捷" value={stats.spd.value} bonus={stats.spd.bonus} />
                    </div>

                    <button type="button" className="witch-character-stats__more">
                      More Stats
                    </button>

                    <div className="witch-character-stats__summary">
                      <div>
                        <span>完成任務</span>
                        <strong>{completedCount}</strong>
                      </div>
                      <div>
                        <span>持有金幣</span>
                        <strong>{availableGold}</strong>
                      </div>
                      <div>
                        <span>商店兌換</span>
                        <strong>{redeemHistory.length}</strong>
                      </div>
                      <div>
                        <span>總任務數</span>
                        <strong>{totalCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
