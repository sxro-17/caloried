import { useState } from 'react'
import DashboardSidebar from './DashboardSidebar'
import './Help.css'

const faqs = [
  {
    question: 'How do I add a food entry?',
    answer: 'Open Food Log, choose the meal you want to update, and select Add Food. Enter the food details, then save the entry. The food will be included in that date’s meal and daily totals.',
  },
  {
    question: 'How do I edit or delete a food entry?',
    answer: 'In Food Log, open the three-dot menu beside an entry. Choose Edit to update its details, or choose Delete and confirm when prompted. Your totals update automatically after either action.',
  },
  {
    question: 'How do I change my daily nutrition goals?',
    answer: 'Open Settings from the sidebar, update your calorie or macro goals, and select Save Goals. The updated goals are used across your Dashboard, Food Log, History, and Profile.',
  },
  {
    question: 'How do I view previous meals through History?',
    answer: 'Open History from the sidebar to see your last seven days. Select a daily record to open Food Log for that specific date and review the meals logged there.',
  },
  {
    question: 'How does localStorage save my information?',
    answer: 'Calorie’d stores your food entries, profile details, and nutrition goals in your browser’s localStorage. This keeps the information available when you refresh or reopen the site in the same browser.',
  },
  {
    question: 'Why does my data not synchronize across devices?',
    answer: 'Your information is currently stored only in the browser you are using. Because there is no account or cloud database in Version 1, changes on one device are not shared with another device.',
  },
]

function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="help" />
      <main className="dashboard-main help-main">
        <header className="help-header">
          <p className="dashboard-kicker">We’re here to help</p>
          <h1>Help Center</h1>
          <p>Find quick answers about using Calorie’d and keeping your nutrition information organized.</p>
        </header>

        <section className="help-card" aria-labelledby="faq-heading">
          <div className="help-section-heading">
            <p className="dashboard-kicker">Common questions</p>
            <h2 id="faq-heading">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              const answerId = `faq-answer-${index}`
              return (
                <div className={`faq-item ${isOpen ? 'open' : ''}`} key={faq.question}>
                  <button className="faq-question" type="button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <span>{faq.question}</span>
                    <span className="faq-icon" aria-hidden="true">+</span>
                  </button>
                  <div className="faq-answer" id={answerId} hidden={!isOpen}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="good-to-know" aria-labelledby="good-to-know-heading">
          <div className="good-to-know-mark" aria-hidden="true">i</div>
          <div><p className="dashboard-kicker">A helpful reminder</p><h2 id="good-to-know-heading">Good to Know</h2><p>Nutrition information is entered manually, so check serving sizes and nutrition values for accuracy before saving an entry.</p></div>
        </section>
      </main>
    </div>
  )
}

export default Help
