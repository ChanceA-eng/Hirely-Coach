"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  type HelpArticle,
  type HelpCategory,
} from "../data/help-articles";
import "./page.css";

// ── Category colour map ────────────────────────────────────────────────────
const CAT_COLOR: Record<HelpCategory, string> = {
  game: "#10b981",
  academy: "#6366f1",
  tools: "#f59e0b",
  notifications: "#ec4899",
};

// ── Category label map ────────────────────────────────────────────────────
const CAT_LABEL: Record<HelpCategory, string> = {
  game: "The Game",
  academy: "Academy",
  tools: "Tools",
  notifications: "Notifications",
};

// ─── Article detail view ───────────────────────────────────────────────────
function ArticleView({
  article,
  onBack,
  onNavigate,
}: {
  article: HelpArticle;
  onBack: () => void;
  onNavigate: (article: HelpArticle) => void;
}) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const color = CAT_COLOR[article.category];

  return (
    <motion.div
      className="hc-article-view"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
    >
      <button className="hc-back-btn" onClick={onBack} type="button">
        ← Back to Help Center
      </button>

      <span
        className="hc-article-cat-badge"
        style={{
          background: `${color}1a`,
          color,
          border: `1px solid ${color}44`,
        }}
      >
        {CAT_LABEL[article.category]}
      </span>

      <h1 className="hc-article-title">{article.title}</h1>
      <p className="hc-article-summary">{article.summary}</p>

      {article.content.map((section, i) => (
        <div className="hc-article-section" key={i}>
          {section.heading && (
            <h2 className="hc-article-section-heading">{section.heading}</h2>
          )}
          <p className="hc-article-body">{section.body}</p>
          {section.list && (
            <ul className="hc-article-list-items">
              {section.list.map((item, j) => (
                <li className="hc-article-list-item" key={j}>
                  <span className="hc-article-list-item-dot" />
                  <div>
                    <div className="hc-article-list-label">{item.label}</div>
                    <div className="hc-article-list-detail">{item.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* See Also */}
      {article.seeAlso && article.seeAlso.length > 0 && (
        <div className="hc-see-also">
          <h3 className="hc-see-also-heading">See Also</h3>
          <ul className="hc-see-also-list">
            {article.seeAlso.map((refId) => {
              const linked = HELP_ARTICLES.find((a) => a.id === refId);
              if (!linked) return null;
              return (
                <li key={refId}>
                  <button
                    type="button"
                    className="hc-see-also-link"
                    onClick={() => {
                      const linked = HELP_ARTICLES.find((a) => a.id === refId);
                      if (linked) onNavigate(linked);
                    }}
                  >
                    {linked.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Feedback toggle */}
      <div className="hc-feedback">
        {feedback ? (
          <span className="hc-feedback-thanks">
            {feedback === "yes" ? "✓ Thanks for the feedback!" : "Thanks — we'll improve this article."}
          </span>
        ) : (
          <>
            <span className="hc-feedback-label">Was this article helpful?</span>
            <div className="hc-feedback-btns">
              <button
                type="button"
                className={`hc-feedback-btn hc-feedback-btn--yes${feedback === "yes" ? " active" : ""}`}
                onClick={() => setFeedback("yes")}
              >
                👍 Yes
              </button>
              <button
                type="button"
                className={`hc-feedback-btn hc-feedback-btn--no${feedback === "no" ? " active" : ""}`}
                onClick={() => setFeedback("no")}
              >
                👎 No
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Help Center ──────────────────────────────────────────────────────
export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | null>(null);
  const [openArticle, setOpenArticle] = useState<HelpArticle | null>(null);

  // Support deep-linking via ?article=slug
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("article");
    if (slug) {
      const found = HELP_ARTICLES.find((a) => a.slug === slug || a.id === slug);
      if (found) setOpenArticle(found);
    }
  }, []);

  const results = useMemo(() => {
    let list = searchArticles(query);
    if (activeCategory) list = list.filter((a) => a.category === activeCategory);
    return list;
  }, [query, activeCategory]);

  const isSearching = query.trim().length > 0;

  if (openArticle) {
    return (
      <AnimatePresence mode="wait">
        <ArticleView
          key={openArticle.id}
          article={openArticle}
          onBack={() => setOpenArticle(null)}
          onNavigate={(a) => setOpenArticle(a)}
        />
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="hc-main"
        className="hc-root"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      >
        {/* ── Hero ── */}
        <div className="hc-hero">
          <div className="hc-hero-eyebrow">Knowledge Base</div>
          <h1 className="hc-hero-title">Hirely Help Center</h1>
          <p className="hc-hero-sub">
            Everything you need to master the platform — from IP & Ranks to the Job Seeder.
          </p>

          {/* Search */}
          <div className="hc-search-wrap">
            <span className="hc-search-icon" aria-hidden="true">⌕</span>
            <input
              className="hc-search-input"
              type="search"
              placeholder='Try "IP", "locked course", "job URL" …'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search help articles"
              autoFocus
            />
            {query && (
              <button
                className="hc-search-clear"
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Categories (shown when not actively searching) ── */}
        {!isSearching && (
          <>
            <div className="hc-section-label">Browse by Topic</div>
            <div className="hc-cat-grid">
              {HELP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`hc-cat-card${activeCategory === cat.id ? " hc-cat-card--active" : ""}`}
                  onClick={() =>
                    setActiveCategory((prev) => (prev === cat.id ? null : cat.id))
                  }
                  style={
                    activeCategory === cat.id
                      ? { borderColor: `${cat.color}66`, background: `${cat.color}0d` }
                      : undefined
                  }
                >
                  <span className="hc-cat-icon" style={{ color: cat.color }}>
                    {cat.icon}
                  </span>
                  <span className="hc-cat-name">{cat.label}</span>
                  <span className="hc-cat-desc">{cat.description}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Article list ── */}
        <div className="hc-section-label">
          {isSearching
            ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
            : activeCategory
            ? `${CAT_LABEL[activeCategory]} Articles`
            : "All Articles"}
        </div>

        {results.length === 0 ? (
          <div className="hc-no-results">
            <strong>No articles found</strong>
            Try a different keyword or{" "}
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#10b981",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "inherit",
                padding: 0,
              }}
              onClick={() => { setQuery(""); setActiveCategory(null); }}
            >
              browse all articles
            </button>
            .
          </div>
        ) : (
          <div className="hc-article-list">
            {results.map((article) => {
              const color = CAT_COLOR[article.category];
              return (
                <motion.button
                  key={article.id}
                  type="button"
                  className="hc-article-row"
                  onClick={() => setOpenArticle(article)}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <div className="hc-article-row-left">
                    <span className="hc-article-row-title">{article.title}</span>
                    <span className="hc-article-row-summary">{article.summary}</span>
                  </div>
                  <span
                    className="hc-article-row-tag"
                    style={{ background: `${color}18`, color }}
                  >
                    {CAT_LABEL[article.category]}
                  </span>
                  <span className="hc-article-arrow">→</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
