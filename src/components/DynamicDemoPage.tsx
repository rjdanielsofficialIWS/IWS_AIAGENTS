{/* Smaller + more subtle Calendly CTA */}
<div className="mt-5 flex flex-col items-center">
  <a
    href={CALENDLY_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
    style={{
      borderColor: 'rgba(200, 162, 74, 0.45)',
      color: GOLD_HOVER,
      backgroundColor: 'rgba(0,0,0,0.10)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(227, 195, 106, 0.65)';
      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(200, 162, 74, 0.45)';
      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
    }}
  >
    <Calendar className="h-3.5 w-3.5" />
    Book intro call
  </a>

  <p className="mt-1 text-[11px] text-gray-400">
    Quick intro + we’ll show how it fits.
  </p>
</div>