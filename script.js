(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
  const wholeMoney = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
  const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const instruments = [
    {symbol:"NIFTY",name:"NIFTY 50",price:24985.40,change:0.62,kind:"Index"},
    {symbol:"SENSEX",name:"SENSEX",price:81640.20,change:0.48,kind:"Index"},
    {symbol:"BANKNIFTY",name:"BANK NIFTY",price:56210.75,change:-0.16,kind:"Index"},
    {symbol:"RELIANCE",name:"Reliance Industries",price:1421.50,change:0.83,kind:"Equity"},
    {symbol:"TCS",name:"Tata Consultancy Services",price:3845.00,change:-0.35,kind:"Equity"},
    {symbol:"INFY",name:"Infosys",price:1612.25,change:1.12,kind:"Equity"},
    {symbol:"HDFCBANK",name:"HDFC Bank",price:1748.80,change:0.27,kind:"Equity"},
    {symbol:"ITC",name:"ITC Limited",price:438.60,change:-0.22,kind:"Equity"},
    {symbol:"TATAMOTORS",name:"Tata Motors",price:714.20,change:0.54,kind:"Equity"}
  ];
  const initialState = () => ({cash:1000000,positions:{},orders:[],realized:0,watchlist:["NIFTY","RELIANCE","TCS","INFY"],completed:[],journal:[]});
  const loadState = () => {try{const saved=JSON.parse(localStorage.getItem("decrotradePracticeV2"));return saved&&typeof saved.cash==="number"?{...initialState(),...saved}:initialState()}catch{return initialState()}};
  let state=loadState();
  const save = () => {try{localStorage.setItem("decrotradePracticeV2",JSON.stringify(state))}catch{}};
  let toastTimer;
  function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500)}
  function priceOf(symbol){return instruments.find(x=>x.symbol===symbol)?.price||0}
  function fmtChange(n){return (n>=0?"+":"")+n.toFixed(2)+"%"}
  function renderChart(symbol="NIFTY",range="1D"){
    const item=instruments.find(x=>x.symbol===symbol)||instruments[0];
    $("#chartSymbol").textContent=item.name;
    $("#chartPrice").textContent=item.price.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
    const counts={"1D":32,"1W":36,"1M":42,"1Y":48},count=counts[range]||32;
    let values=[],v=100;
    for(let i=0;i<count;i++){const wave=Math.sin(i*.58)*1.8+Math.cos(i*.21)*1.1;v+=wave+(i%5===0?-1.4:0)+((item.change>=0)?0.16:-0.09);values.push(v)}
    values[values.length-1]=v+(item.change>=0?2:-2);
    const min=Math.min(...values)-2,max=Math.max(...values)+2;
    const points=values.map((n,i)=>[12+i*(696/(count-1)),190-((n-min)/(max-min))*165]);
    const d=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    $("#chartLine").setAttribute("d",d);
    $("#chartLine").setAttribute("stroke",item.change>=0?"#347c63":"#bd695b");
    $("#chartArea").setAttribute("d",d+" L 708 204 L 12 204 Z");
    $("#chartArea").setAttribute("fill",item.change>=0?"url(#chartFill)":"#bd695b10");
    $$(".index-card").forEach(b=>b.classList.toggle("selected",b.dataset.symbol===symbol));
  }
  function renderWatchlist(target="#overviewWatchlist"){
    const root=$(target);if(!root)return;
    const rows=state.watchlist.map(s=>instruments.find(x=>x.symbol===s)).filter(Boolean);
    root.innerHTML=rows.length?rows.map(x=>'<div class="watch-row"><div class="watch-name"><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.symbol)+' · '+x.kind+'</small></div><div class="watch-price"><strong>'+x.price.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})+'</strong><small class="'+(x.change>=0?"positive":"negative")+'">'+fmtChange(x.change)+'</small></div><span class="watch-change '+(x.change>=0?"positive":"negative")+'">'+(x.change>=0?"↗":"↘")+'</span></div>').join(""):'<div class="empty-state"><strong>Your watchlist is empty</strong><p>Add instruments from Markets.</p></div>';
  }
  function renderMarkets(){
    const q=($("#marketSearch")?.value||"").toLowerCase().trim();
    const rows=instruments.filter(x=>(x.name+" "+x.symbol+" "+x.kind).toLowerCase().includes(q));
    $("#marketCount").textContent=rows.length+" instruments";
    $("#marketRows").innerHTML=rows.map(x=>'<tr><td><div class="instrument-cell"><span class="ticker-icon">'+escapeHtml(x.symbol.slice(0,3))+'</span><div><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.symbol)+' · '+x.kind+'</small></div></div></td><td>'+x.price.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})+'</td><td class="'+(x.change>=0?"positive":"negative")+'">'+fmtChange(x.change)+'</td><td><button class="star-button '+(state.watchlist.includes(x.symbol)?"is-starred":"")+'" data-star="'+x.symbol+'" aria-label="Toggle '+x.symbol+' watchlist">'+(state.watchlist.includes(x.symbol)?"★":"☆")+'</button></td><td><button class="table-action" data-practice="'+x.symbol+'" '+(["NIFTY","SENSEX","BANKNIFTY"].includes(x.symbol)?"disabled title='Index not available for simulated individual equity orders'":"")+'>Practice trade</button></td></tr>').join("");
  }
  function renderPositions(){
    const entries=Object.entries(state.positions).filter(([,p])=>p.qty>0);
    $("#positionCount").textContent=entries.length+" position"+(entries.length===1?"":"s");
    let invested=0,unreal=0;
    entries.forEach(([symbol,p])=>{invested+=p.avg*p.qty;unreal+=(priceOf(symbol)-p.avg)*p.qty});
    $("#investedValue").textContent=money(invested);
    $("#unrealizedPnl").textContent=(unreal>=0?"+":"")+money(unreal);
    $("#unrealizedPnl").className=unreal>=0?"positive":"negative";
    $("#positionsContainer").className=entries.length?"positions-list":"empty-state";
    $("#positionsContainer").innerHTML=entries.length?entries.map(([symbol,p])=>{const val=priceOf(symbol)*p.qty,pnl=(priceOf(symbol)-p.avg)*p.qty;return '<div class="position-row"><div class="position-name"><strong>'+escapeHtml(symbol)+'</strong><small>'+p.qty+' shares · Avg. '+money(p.avg)+'</small></div><div class="position-value"><strong>'+money(val)+'</strong><small class="'+(pnl>=0?"positive":"negative")+'">'+(pnl>=0?"+":"")+money(pnl)+'</small></div><button class="sell-button" data-sell="'+symbol+'">Sell</button></div>'}).join(""):'<span class="empty-icon">⌁</span><strong>No open positions yet</strong><p>Your practice holdings will appear here after a simulated buy order.</p>';
    $("#paperCash").textContent=wholeMoney(state.cash);
    $("#overviewBalance").textContent=wholeMoney(state.cash);
    $("#overviewPositions").textContent=entries.length;
    $("#overviewHoldingsValue").textContent=wholeMoney(invested)+" invested";
    $("#overviewPnl").textContent=(state.realized>=0?"+":"")+money(state.realized);
    $("#overviewPnl").className=state.realized>=0?"positive":"negative";
  }
  function renderOrders(){
    $("#orderHistoryRows").innerHTML=state.orders.slice(0,50).map(o=>'<tr><td>'+escapeHtml(o.time)+'</td><td><strong>'+escapeHtml(o.symbol)+'</strong></td><td class="'+(o.side==="BUY"?"side-buy":"side-sell")+'">'+o.side+'</td><td>'+o.qty+'</td><td>'+money(o.price)+'</td><td>'+money(o.total)+'</td><td><span class="status-pill">Simulated</span></td></tr>').join("");
    $("#historyEmpty").classList.toggle("hidden",state.orders.length>0);
  }
  function renderProgress(){
    const done=state.completed.length,total=lessons.length,pct=done/total*100;
    $("#overviewProgress").textContent=done+" / "+total;
    $("#overviewProgressBar").style.width=pct+"%";
    $("#academyProgressNumber").textContent=done+" / "+total;
    $("#academyProgressBar").style.width=pct+"%";
    $("#academyProgressText").textContent=done===total?"All lessons completed — great work!":done===0?"Your learning journey":"You're building momentum";
  }
  function renderAll(){renderWatchlist();renderMarkets();renderPositions();renderOrders();renderProgress();renderJournal()}
  function submitOrder(symbol,side,qty){
    const price=priceOf(symbol),total=price*qty;
    if(!price||!Number.isInteger(qty)||qty<1||qty>100000){toast("Enter a valid whole-number quantity.");return false}
    const pos=state.positions[symbol]||{qty:0,avg:0};
    if(side==="BUY"){
      if(total>state.cash){toast("Not enough virtual cash for this order.");return false}
      state.cash-=total;const nextQty=pos.qty+qty;pos.avg=(pos.avg*pos.qty+total)/nextQty;pos.qty=nextQty;state.positions[symbol]=pos;
    }else{
      if(pos.qty<qty){toast("You don't have enough shares in this virtual position to sell.");return false}
      state.cash+=total;state.realized+=(price-pos.avg)*qty;pos.qty-=qty;if(pos.qty===0)delete state.positions[symbol];else state.positions[symbol]=pos;
    }
    state.orders.unshift({time:new Date().toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}),symbol,side,qty,price,total});
    save();renderAll();toast(side==="BUY"?"Virtual buy order simulated.":"Virtual sell order simulated.");return true;
  }
  const lessons=[
    {title:"Trading foundations",level:"BEGINNER",time:"5 min",desc:"Understand what markets do, why prices move and how orders work.",body:["A market brings buyers and sellers together. Prices change as their expectations and willingness to trade change.","A market order aims to execute promptly at available prices; a limit order sets a maximum buy or minimum sell price. Execution is not guaranteed for a limit order.","Before practising, understand the instrument, its trading hours, costs and the possibility of loss."],q:"What does a limit buy order specify?",opts:["The maximum price you are willing to pay","A guaranteed profit amount","The exact future market price"],answer:0,why:"A limit buy specifies the highest price you are willing to pay; it may not execute."},
    {title:"Read candlesticks",level:"BEGINNER",time:"7 min",desc:"Read open, high, low and close, plus what candle bodies and wicks show.",body:["Each candle summarizes price action for a chosen time interval: open, high, low and close (OHLC).","The body shows the distance between open and close. Wicks show how far price moved above and below the body during that interval.","A candle does not predict the next move by itself. Context, timeframe and other evidence matter."],q:"What do a candle's wicks represent?",opts:["The day's trading fees","The high and low reached during the interval","The number of buyers only"],answer:1,why:"Wicks show the high and low reached during the candle's time interval."},
    {title:"Trends & market structure",level:"BEGINNER",time:"6 min",desc:"Learn the common language used to describe uptrends, downtrends and ranges.",body:["An uptrend is often described by a sequence of higher highs and higher lows; a downtrend by lower highs and lower lows.","A range is a period when price moves between a relatively stable upper and lower area.","These descriptions are interpretations of past price action, not guarantees of what happens next."],q:"Which pattern is commonly associated with an uptrend?",opts:["Lower highs and lower lows","Only flat prices","Higher highs and higher lows"],answer:2,why:"Higher highs and higher lows are a common way to describe an uptrend."},
    {title:"Indicators without the hype",level:"INTERMEDIATE",time:"8 min",desc:"Understand moving averages, RSI and why indicators can give misleading signals.",body:["A moving average smooths historical prices over a chosen number of periods; it can help describe trend but reacts with a delay.","RSI is a momentum oscillator commonly displayed from 0 to 100. Traditional levels such as 70 and 30 are context clues, not automatic sell or buy commands.","Indicators are derived from past data and can disagree or give false signals, especially in fast-changing conditions."],q:"What is an important limitation of technical indicators?",opts:["They guarantee the next price move","They are based on past data and can give false signals","They remove all market risk"],answer:1,why:"Indicators summarize past data and cannot guarantee future price movements."},
    {title:"Risk & position sizing",level:"ESSENTIAL",time:"9 min",desc:"Explore risk per trade, position sizing and why a stop is not a guarantee.",body:["Risk management begins by deciding what loss would be tolerable before entering a trade, rather than choosing a position first and hoping for the best.","A basic educational position-sizing idea is: planned rupee risk divided by the difference between entry and planned exit level. Costs and gaps can make actual outcomes different.","Stops do not guarantee the exact exit price. Leverage can magnify both gains and losses; beginners should focus on understanding risk before using it."],q:"Does a stop order guarantee an exit at the chosen price?",opts:["Yes, in every market condition","No, execution can differ in fast or gapping markets","Only when the trade is profitable"],answer:1,why:"A stop can trigger an order, but fast markets and gaps can cause execution away from the chosen level."},
    {title:"Build a trading journal",level:"INTERMEDIATE",time:"5 min",desc:"Turn practice into feedback by recording the plan, decision and reflection.",body:["A useful journal records the setup, the reason for entry, the planned invalidation point, position size and what happened.","Review whether you followed your process separately from whether a single trade made or lost virtual money.","Look for repeated habits across a meaningful sample; a small number of outcomes does not prove a strategy works."],q:"What is the most useful way to review a practice trade?",opts:["Only look at profit or loss","Change rules after every loss","Compare the decision with the plan and record what you learned"],answer:2,why:"Reviewing the process helps distinguish a good decision from a lucky or unlucky outcome."}
  ];
  function renderLessons(){
    $("#lessonGrid").innerHTML=lessons.map((l,i)=>{const done=state.completed.includes(i);return '<article class="lesson-card '+(done?"completed":"")+'"><div class="lesson-card-top"><span class="lesson-number">'+(done?"✓":String(i+1).padStart(2,"0"))+'</span><span class="lesson-status">'+(done?"COMPLETED":l.level)+'</span></div><h3>'+escapeHtml(l.title)+'</h3><p>'+escapeHtml(l.desc)+'</p><span class="lesson-meta">◷ '+l.time+' · 1 knowledge check</span><button class="button '+(done?"button-outline":"button-dark")+'" data-lesson="'+i+'">'+(done?"Review lesson":"Start lesson")+' ↗</button></article>'}).join("");
    renderProgress();
  }
  let activeQuiz=null;
  function openLesson(i){
    const l=lessons[i];if(!l)return;activeQuiz={i,answered:false};
    $("#lessonDialogContent").innerHTML='<p class="eyebrow">LESSON '+String(i+1).padStart(2,"0")+' · '+l.level+'</p><h2>'+escapeHtml(l.title)+'</h2>'+l.body.map(p=>'<p>'+escapeHtml(p)+'</p>').join("")+'<div class="quiz-box"><p class="eyebrow">CHECK YOUR UNDERSTANDING</p><h3>'+escapeHtml(l.q)+'</h3>'+l.opts.map((o,j)=>'<button class="quiz-option" data-answer="'+j+'">'+escapeHtml(o)+'</button>').join("")+'<p class="quiz-feedback" id="quizFeedback" aria-live="polite"></p><button class="button button-dark" id="finishLesson" disabled>Mark lesson complete</button></div>';
    $("#lessonDialog").showModal();
  }
  function renderGlossary(){
    const terms=[["Candlestick","A chart symbol showing open, high, low and close over a time interval."],["Trend","A broad direction inferred from a sequence of price movements."],["Volume","The amount of an instrument traded during a specified period."],["Volatility","How much and how quickly a price tends to fluctuate."],["Liquidity","How easily an asset can be traded without a large price impact."],["Support","An area where buying interest has previously appeared; not a guaranteed floor."],["Resistance","An area where selling interest has previously appeared; not a guaranteed ceiling."],["RSI","A momentum oscillator that compares recent upward and downward price changes."],["Moving average","An average of prices over a selected number of periods, updated as new data arrives."],["Stop order","An order that becomes active after a specified trigger level is reached; execution price may differ."],["Position sizing","Choosing quantity in relation to planned risk, account size and trade invalidation."],["Drawdown","A decline from a portfolio's previous peak value."]];
    const q=($("#glossarySearch")?.value||"").toLowerCase().trim();
    $("#glossaryGrid").innerHTML=terms.map(([term,desc])=>'<article class="glossary-item" '+((term+" "+desc).toLowerCase().includes(q)?"":"hidden")+'><strong>'+escapeHtml(term)+'</strong><p>'+escapeHtml(desc)+'</p></article>').join("");
  }
  const aiAnswers=[
    {keys:["rsi","relative strength"],answer:"RSI (Relative Strength Index) is a momentum indicator commonly shown from 0 to 100. Traders often watch 70 and 30 as traditional overbought/oversold reference levels, but those levels are not automatic signals. RSI can stay elevated or low during strong trends, so learn it in context and never treat it as a guarantee."},
    {keys:["risk","stop loss","position size","leverage"],answer:"Risk management means planning how much uncertainty and potential loss you can tolerate before making a decision. Learn position sizing, the difference between entry and invalidation, possible gaps, fees and how leverage can magnify losses. A stop order does not guarantee an exact exit price. In this practice app, use virtual orders only."},
    {keys:["candlestick","candle","wick","ohlc"],answer:"A candlestick summarises four prices for a time interval: open, high, low and close. The body spans the open and close; the wicks show the interval's high and low. Candle colour usually indicates whether the close was above or below the open. One candle alone cannot reliably predict what comes next."},
    {keys:["support","resistance"],answer:"Support and resistance are areas where price has previously struggled to move lower or higher. They are zones, not precise walls, and can break. People often look for context such as trend, volume and a clear plan, but no combination guarantees a result."},
    {keys:["moving average","sma","ema"],answer:"A moving average smooths prices over a chosen number of periods. A simple moving average gives each observation in the window equal weight; an exponential moving average weights recent observations more. Both lag price and can give misleading signals in choppy markets."},
    {keys:["volume"],answer:"Volume measures how much of an instrument traded during a period. Some traders use it to add context to a price move, but volume alone doesn't reveal every participant's intention or predict the next move."},
    {keys:["journal","trade log"],answer:"A useful trading journal records the idea, entry reasoning, planned invalidation, quantity, outcome and a short reflection. Review whether you followed your plan separately from whether the result was positive. Avoid changing a method based on only one or two outcomes."},
    {keys:["trend","uptrend","downtrend"],answer:"A common description of an uptrend is a sequence of higher highs and higher lows; a downtrend often has lower highs and lower lows. A range moves between areas of support and resistance. These labels describe observed price action and do not guarantee continuation."},
    {keys:["paper trading","virtual","simulated"],answer:"Paper trading lets you rehearse decisions with virtual funds instead of placing real-money orders. It can help practise order entry and journaling, but simulated fills may not reflect slippage, liquidity, emotions or real market conditions. Treat results as learning, not proof of future performance."}
  ];
  function aiReply(question){
    const q=question.toLowerCase();
    const found=aiAnswers.find(item=>item.keys.some(k=>q.includes(k)));
    if(found)return found.answer;
    if(q.includes("buy")||q.includes("sell")||q.includes("should i")||q.includes("recommend")||q.includes("target")||q.includes("prediction"))return "I can't tell you what to buy or sell, set a target, or predict a market outcome. I can help you learn how an instrument works, compare educational concepts, or think through general risk factors. Any chart or quote in this preview is illustrative rather than live.";
    if(q.includes("hello")||q.includes("hi "))return "Hello! Pick a concept—candlesticks, trends, RSI, moving averages, volume, or risk management—and I'll explain its basics. This is a built-in learning preview, not a live AI model.";
    return "A good way to explore this is to define the concept, understand how it is calculated or used, then study its limitations and practise describing it in your own words. Try asking about candlesticks, RSI, moving averages, support and resistance, volume, trends, paper trading or risk management. I'm currently a built-in educational preview; a live AI model has not been connected.";
  }
  function addChat(text,who){
    const wrap=document.createElement("div");wrap.className="chat-message "+(who==="user"?"user-message":"assistant-message");
    const avatar=document.createElement("div");avatar.className="message-avatar";avatar.textContent=who==="user"?"D":"✳";
    const content=document.createElement("div");const strong=document.createElement("strong");strong.textContent=who==="user"?"You":"Dec AI";const p=document.createElement("p");p.textContent=text;const time=document.createElement("span");time.className="message-time";time.textContent=who==="user"?"Your message":"Educational preview";
    content.append(strong,p,time);wrap.append(avatar,content);$("#chatMessages").append(wrap);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;
  }
  function renderJournal(){
    const root=$("#journalEntries");if(!root)return;
    if(!state.journal.length){root.innerHTML='<div class="empty-state"><span class="empty-icon">☷</span><strong>No reflections yet</strong><p>Your notes will be stored in this browser.</p></div>';return}
    root.innerHTML=state.journal.map(j=>'<article class="journal-entry"><div class="journal-entry-top"><strong>'+escapeHtml(j.title)+'</strong><span class="mood-tag">'+escapeHtml(j.mood)+'</span></div><p>'+escapeHtml(j.notes)+'</p><small>'+escapeHtml(j.time)+'</small></article>').join("");
  }
  function switchView(view){
    if(!$("#view-"+view))return;
    $$(".view").forEach(v=>v.classList.toggle("active-view",v.id==="view-"+view));
    $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    const labels={overview:"Overview",markets:"Markets",paper:"Paper trading",academy:"Trading academy",ai:"Dec AI",journal:"Trade journal",settings:"Settings"};
    $("#pageName").textContent=labels[view]||"Overview";
    $("#sidebar").classList.remove("open");
    if(view==="markets")renderMarkets();if(view==="academy"){renderLessons();renderGlossary()}if(view==="paper"){renderPositions();renderOrders()}
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-view]");if(nav){e.preventDefault();switchView(nav.dataset.view);return}
    const star=e.target.closest("[data-star]");if(star){const s=star.dataset.star;state.watchlist=state.watchlist.includes(s)?state.watchlist.filter(x=>x!==s):[...state.watchlist,s];save();renderAll();toast(state.watchlist.includes(s)?"Added to watchlist":"Removed from watchlist");return}
    const trade=e.target.closest("[data-practice]");if(trade){$("#orderSymbol").value=trade.dataset.practice;switchView("paper");updateEstimate();return}
    const sell=e.target.closest("[data-sell]");if(sell){const p=state.positions[sell.dataset.sell];if(p)submitOrder(sell.dataset.sell,"SELL",p.qty);return}
    const lesson=e.target.closest("[data-lesson]");if(lesson){openLesson(Number(lesson.dataset.lesson));return}
    const finish=e.target.closest("#finishLesson");if(finish&&activeQuiz){if(!state.completed.includes(activeQuiz.i))state.completed.push(activeQuiz.i);save();renderLessons();$("#lessonDialog").close();toast("Lesson progress saved on this device.");return}
    const answer=e.target.closest("[data-answer]");if(answer&&activeQuiz&&!activeQuiz.answered){activeQuiz.answered=true;const l=lessons[activeQuiz.i],correct=Number(answer.dataset.answer)===l.answer;$$("[data-answer]").forEach(b=>{b.disabled=true;if(Number(b.dataset.answer)===l.answer)b.classList.add("correct")});if(!correct)answer.classList.add("incorrect");const fb=$("#quizFeedback");fb.className="quiz-feedback "+(correct?"correct":"incorrect");fb.textContent=(correct?"Correct. ":"Not quite. ")+l.why;$("#finishLesson").disabled=false;$("#finishLesson").textContent=state.completed.includes(activeQuiz.i)?"Lesson already completed":"Mark lesson complete";return}
    const range=e.target.closest("[data-range]");if(range){$$("[data-range]").forEach(b=>b.classList.toggle("active",b===range));renderChart($("#chartSymbol").textContent==="SENSEX"?"SENSEX":$("#chartSymbol").textContent==="BANK NIFTY"?"BANKNIFTY":"NIFTY",range.dataset.range);return}
    const index=e.target.closest("[data-symbol]");if(index){renderChart(index.dataset.symbol,$("[data-range].active")?.dataset.range||"1D");return}
    const prompt=e.target.closest("[data-prompt]");if(prompt){$("#chatInput").value=prompt.dataset.prompt;$("#chatForm").requestSubmit();return}
  });
  $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#helpButton").addEventListener("click",()=>toast("Choose Paper trading to practise, Academy to learn, or Dec AI for concept explanations."));
  $("#dismissNotice").addEventListener("click",()=>$(".notice-strip").remove());
  $("#marketSearch").addEventListener("input",renderMarkets);
  $("#glossarySearch").addEventListener("input",renderGlossary);
  $("#closeLesson").addEventListener("click",()=>$("#lessonDialog").close());
  function updateEstimate(){
    const symbol=$("#orderSymbol").value,qty=Math.max(1,Math.floor(Number($("#orderQty").value)||1)),side=$('input[name="orderSide"]:checked').value;
    $("#orderEstimate").textContent=money(priceOf(symbol)*qty);
    $("#submitOrder").textContent="Place virtual "+side+" order";
    $("#submitOrder").style.background=side==="buy"?"var(--green)":"#ad6256";
    $("#orderHint").textContent=side==="buy"?"Buy orders use your virtual cash balance.":"Sell orders reduce an existing virtual position.";
    $("#orderError").textContent="";
  }
  $("#orderSymbol").addEventListener("change",updateEstimate);$("#orderQty").addEventListener("input",updateEstimate);$$('input[name="orderSide"]').forEach(el=>el.addEventListener("change",updateEstimate));
  $("#qtyMinus").addEventListener("click",()=>{$("#orderQty").value=Math.max(1,Number($("#orderQty").value||1)-1);updateEstimate()});
  $("#qtyPlus").addEventListener("click",()=>{$("#orderQty").value=Math.min(100000,Number($("#orderQty").value||1)+1);updateEstimate()});
  $("#orderForm").addEventListener("submit",e=>{e.preventDefault();const symbol=$("#orderSymbol").value,side=$('input[name="orderSide"]:checked').value.toUpperCase(),qty=Number($("#orderQty").value);if(!Number.isInteger(qty)||qty<1){$("#orderError").textContent="Enter a whole-number quantity of at least 1.";return}const ok=submitOrder(symbol,side,qty);if(!ok)$("#orderError").textContent="Order not placed. Check virtual funds and available shares."});
  function resetAccount(){if(!confirm("Reset virtual cash to ₹10,00,000 and clear positions and practice order history? This cannot be undone."))return;const oldWatch=state.watchlist;state=initialState();state.watchlist=oldWatch;save();renderAll();toast("Virtual account reset. Learning progress and journal notes were kept.");}
  $("#resetAccount").addEventListener("click",resetAccount);$("#settingsReset").addEventListener("click",resetAccount);
  $("#chatForm").addEventListener("submit",e=>{e.preventDefault();const q=$("#chatInput").value.trim();if(!q)return;addChat(q,"user");$("#chatInput").value="";setTimeout(()=>addChat(aiReply(q),"assistant"),180)});
  $("#clearChat").addEventListener("click",()=>{$("#chatMessages").innerHTML='<div class="chat-message assistant-message"><div class="message-avatar">✳</div><div><strong>Hi, I’m Dec AI.</strong><p>I can help explain trading concepts and risk-management basics. What would you like to understand today?</p><span class="message-time">Educational preview</span></div></div>';toast("Chat cleared.")});
  $("#journalForm").addEventListener("submit",e=>{e.preventDefault();state.journal.unshift({title:$("#journalTitle").value.trim(),mood:$("#journalMood").value,notes:$("#journalNotes").value.trim(),time:new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})});save();renderJournal();e.target.reset();toast("Reflection saved on this device.")});
  $("#exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),practiceAccount:state,notice:"Sample prices only. This export contains local practice data."},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="decrotrade-practice-data.json";a.click();URL.revokeObjectURL(url);toast("Practice data export prepared.")});
  $("#currentYear").textContent=new Date().getFullYear();
  renderLessons();renderGlossary();renderAll();renderChart();updateEstimate();
})();