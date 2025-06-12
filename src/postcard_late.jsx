import { useState, useEffect } from "react";
import { db, collection, addDoc } from "./firebaseConfig"; // firebase 인증 모듈 불러오기

const getReturnURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("return") || "퀄트릭스 링크";
};

export default function WritingTest() {
  const sections = [
    "인사말/지금의 나",
    "잊고 싶지 않은 생각",
    "내가 배운 것",
    "미래의 나에게 하고 싶은 말",
    "미래의 나에게 하는 약속"
  ];

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTexts, setSectionTexts] = useState(["", "", "", "", ""]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false); // AI 애니메이션 조건 제어용

  const [displayText, setDisplayText] = useState("");
  const predefinedText = "앞으로는 나에게 정말 소중한 것이 무엇인지 기억하고 잊어버리지 않도록 항상 노력할거야. 비록 속도는 좀 느릴지라도 계속해서 조금씩 성장해나가는 내가 될게. 힘든 날에도 스스로를 굳게 믿고 자신감 있는 모습으로 이겨내 볼게."; // 미리 정해진 문장 삽입
  const [preTextIndex, setPreTextIndex] = useState(0);
  const [isPreTextTyping, setIsPreTextTyping] = useState(false); // 타이핑 중인 글자 저장
  const [preTextTyping, setPreTextTyping] = useState("");   // 타이핑 중인 글자

  const typingText = "...DraftMind가 입력중 입니다..."; //입력중
  const hello = "안녕하세요! 저는 글쓰기 전문 AI 'DraftMind'에요. \n당신은 지금 미래의 '나'에게 편지를 쓰고 있군요."; // 인사말
  const fullText = "편지를 잘 쓸 수 있도록, 이번 파트에서는 제가 도와줄게요!"; // AI 글쓰기 제안문구
  const examplePhrase = ["따스한 햇살이", "골목길을 비추고", "나뭇잎 사이로 부는 바람이", "잔잔한 소리를 냈다", "담벼락에는 고양이가 졸고 있었고", "창문 너머로", "김이 서린 찻잔이 보였다", "조용한 거리에", "어울리지 않게", "어디선가 작은 발소리가 들려오고", "고개를 들어", "소리가 난 곳을 찾아 두리번거리자", "멀리서 낯선 그림자를 발견했다"];  // 예시 구문들
  const exampleKeywords = ["따스한", "햇살", "골목길", "비추고", "나뭇잎", "사이", "부는", "바람", "잔잔한", "소리", "냈다", "담벼락", "고양이", "졸고", "있었고", "창문", "너머", "김", "서린", "찻잔", "보였다", "조용한", "거리", "어울리지", "않게", "어디선가", "작은", "발소리", "들려오고", "고개", "들어", "소리", "난", "곳", "찾아", "두리번거리자", "멀리서", "낯선", "그림자", "발견했다"]; // 예시 단어들

  const [typingIndex, setTypingIndex] = useState(0);
  const [helloIndex, setHelloIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);

  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isHelloTyping, setIsHelloTyping] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showInputLockMessage, setShowInputLockMessage] = useState(false);

  const [warning, setWarning] = useState("");

  const [isPressed, setIsPressed] = useState(false);


  // ✨ Prolific ID 상태 추가
  const [prolificId, setProlificId] = useState("");

  // 🔥 입력 잠금 메시지 상태 추가
  useEffect(() => {
    setShowInputLockMessage(isInputDisabled);
  }, [isInputDisabled]);

  const handleChange = (value) => {
    if (currentSectionIndex >= sectionTexts.length) return;

    setCurrentInput(value);
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
    setCurrentWordCount(wordCount);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열
  
    // 🔥 단어 수 계산 (입력된 텍스트가 비어있으면 0으로 설정)
    let words = value.trim().length === 0 ? [] : value.trim().split(/\s+/);
  
    // ✅ 5단어 이상 입력된 경우에만 단어 반복 검사 실행
    if (words.length > 5) {
      // 🔥 같은 단어 반복 확인 및 하나만 입력 방지
      const wordCounts = {};
      words.forEach((word) => {
        word = word.replace(/[.,!?]/g, ""); // 🔥 문장부호 제거 후 단어 카운트
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
  
      // 🔥 중복 단어 비율 계산 (전체 단어의 30% 이상이 동일한 단어면 경고)
      const overusedWords = Object.entries(wordCounts)
        .filter(([_, count]) => count / words.length > 0.3)
        .map(([word]) => word);
  
      if (overusedWords.length > 0) {
        words = words.filter((word) => !overusedWords.includes(word));
        warningMessages.push(`동일 글자의 반복이 감지되었습니다: ${overusedWords.join(", ")}`);
      }} 
    
    // 🔥 중복 제거 후 경고 메시지 설정
    setWarning([...new Set(warningMessages)]);
  };

  // 입력중.. 문구 타이핑효과
  useEffect(() => {
    if (hasTriggeredOnce && !isTypingTextComplete && typingIndex < typingText.length) {
      const timer = setTimeout(() => {
        setDisplayText(typingText.slice(0, typingIndex + 1));
        setTypingIndex(typingIndex + 1);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (typingIndex === typingText.length && !isTypingTextComplete) {
      setTimeout(() => {
        setIsTypingTextComplete(true);
        setDisplayText(""); // 다음 메시지 시작 전 초기화
        setIsHelloTyping(true);
      }, 1000);
    }
  }, [typingIndex, isTypingTextComplete, hasTriggeredOnce]);

  // 인사말 타이핑효과
  useEffect(() => {
    if (isHelloTyping && helloIndex < hello.length) {
      const timer = setTimeout(() => {
        setDisplayText(hello.slice(0, helloIndex + 1));
        setHelloIndex(helloIndex + 1);
      }, 35);
      return () => clearTimeout(timer);
    }

    if (helloIndex === hello.length) {
      setTimeout(() => {
        setDisplayText(""); // 개인화수준 타이핑 시작 전 초기화
        setIsHelloTyping(false);
        setIsFullTextTyping(true);
      }, 2000);
    }
  }, [helloIndex, isHelloTyping]);

  // AI 글쓰기 제안문구 타이핑효과
  useEffect(() => {
    if (isFullTextTyping && fullTextIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, fullTextIndex + 1));
        setFullTextIndex(fullTextIndex + 1);
      }, 30);

      return () => clearTimeout(timer);
    }
    if (isFullTextTyping && fullTextIndex >= fullText.length) {
      setTimeout(() => {
        setIsFullTextTyping(false);
        setIsPreTextTyping(true);   // ✅ 여기서 타이핑 시작
      },2000);
    }
  }, [fullTextIndex, isFullTextTyping]);

  // 미리 정해진 문장 타이핑효과
  useEffect(() => {
    //타이핑 효과 진행
    if (isPreTextTyping && preTextIndex < predefinedText.length) {
      const timer = setTimeout(() => {
        setPreTextTyping(predefinedText.slice(0, preTextIndex + 1));
        setPreTextIndex(preTextIndex + 1);
      }, 50);  // 타이핑 속도 조절
  
      return () => clearTimeout(timer);
    }
  
    if (isPreTextTyping && preTextIndex >= predefinedText.length) {
      setTimeout(() => {
        const finalText = !currentInput.endsWith(predefinedText)
          ? predefinedText : currentInput;

        setCurrentInput(finalText);
        setCurrentWordCount(finalText.trim().split(/\s+/).length);
        handleChange(finalText); // 경고 검사를 다시 실행

        setIsPreTextTyping(false);
      }, 1000);
    }
  }, [isPreTextTyping, preTextIndex]);
  

  // 섹션 전환
  const handleNextSection = () => {
    const updated = [...sectionTexts];
    updated[currentSectionIndex] = currentInput;
    setSectionTexts(updated);

    // 섹션이 마지막이 아닐 경우에만 다음 섹션으로 이동
    if (currentSectionIndex < sections.length - 1) {
      setCurrentInput("");
      setCurrentWordCount(0);
      setCurrentSectionIndex(currentSectionIndex + 1);

      if (currentSectionIndex === 3) {  // 즉, 4 → 5번 섹션으로 넘어가는 순간
        setDisplayText("");
        setTypingIndex(0);
        setHelloIndex(0);
        setFullTextIndex(0);
        setPreTextIndex(0);
        setPreTextTyping("");
        setIsTypingTextComplete(false);
        setIsHelloTyping(false);
        setIsFullTextTyping(false);
        setIsPreTextTyping(false);
        setIsInputDisabled(true);
        setHasTriggeredOnce(true);  // 이게 true가 되면 typingText 타이핑이 시작됨
      } else {
        setIsInputDisabled(false); // ✅ 사용자가 다음으로 넘어갈 때만 활성화
      }
    } else {
      setCurrentInput("");
      setCurrentWordCount(0);
      alert("✉️ 편지 작성이 완료되었습니다! 하단의 제출 버튼을 눌러주세요.");
    }
  };

  // 🔥 Firestore에 데이터 저장하는 함수 추가
  const handleSubmit = async () => {
    let errorMessages = []; 

    // 조건 1: SONA ID 미입력
    if (!prolificId.trim()) {
      errorMessages.push("❌ SONA ID를 적어주세요.");
    }
    
    
    // 조건 2: 아직 섹션 5까지 안옴
    if (currentSectionIndex < sections.length - 1) {
    errorMessages.push("❌ 아직 편지에 필요한 모든 내용이 작성되지 않았습니다.");
    }

    // 조건 3: 마지막 섹션이지만 30단어 미만
    if (currentSectionIndex === sections.length - 1 && currentWordCount < 30) {
      errorMessages.push("❌ 단어 수가 부족합니다 (30단어 이상 작성해주세요).");
    }

    // 🔥 오류 메시지가 하나라도 있으면 제출 불가
    if (errorMessages.length > 0) {
      alert(`⚠️ 다음과 같은 이유로 제출이 실패되었습니다:\n\n${errorMessages.join("\n")}`);
      return;
    }

    try {
      const fullText = sectionTexts.join("\n");
      const totalWordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

      //예시 구문 매칭 개수 계산
      const matchedPhrase = examplePhrase.filter(phrase => fullText.trim().includes(phrase)); // 대소문자 구분없이 매칭

      //예시 단어 매칭 개수 계산
      const textWords = fullText.trim().match(/[가-힣]+/g) || [];
      const matchedWords = exampleKeywords.filter(keyword =>
        textWords.some(word => word.includes(keyword))
      );

      const examplePhraseCount = matchedPhrase.length; // 예시구문 매칭 개수
      const exampleWordCount = matchedWords.length; // 예시단어 매칭 개수


      // 현재 한국 시간(KST) 가져오기
      const koreaTime = new Date();
      // 한국 시간의 날짜와 시간을 문자열로 변환
      const formatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit"
      });

      const formattedKoreaTime = formatter.format(koreaTime);

      //firebase에 UID 포함하여 데이터에 저장
      await addDoc(collection(db, "postcard-late"), {
        SONAId: prolificId.trim(), // ✨ prolific ID 저장
        text: fullText.trim(),
        wordCount: totalWordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        exampleWordCount: exampleWordCount, // 예시단어 매칭개수
        exampleWords: matchedWords.join(", "), // 예시단어 매칭된 단어들
        examplePhraseCount: examplePhraseCount, // 예시구문 매칭개수
        examplePhrases: matchedPhrase.join(", ") // 예시구문 매칭된 구문들
      });

      alert("✅ 작성하신 글이 성공적으로 제출되었습니다!");
      setCurrentInput("");
      setCurrentWordCount(0);
      setSectionTexts(["", "", "", "", ""]);

      setWarning("");
      setProlificId(""); // ✨ 제출 성공 시 ID 초기화


      console.log("🔁 Returning to:", getReturnURL());

      // 🎯 퀄트릭스로 다시 이동
      window.location.href = getReturnURL();

    } catch (error) {
      console.error("🔥 데이터를 저장하는 데 문제가 발생했습니다:", error.message);
      alert(`🔥 데이터를 저장하는 데 문제가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          
      {/* 제목 및 안내 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "5px", fontSize: "18px" }}> 
        <h1>📝 미래의 나에게 편지 쓰기</h1>
        <p style = {{ fontSize: "18px", marginBottom: "-5px"}}> 다음과 같은 순서로 미래의 나에게 편지를 작성해주세요 (한 파트 당 30단어 이상)</p>
        <div style={{ lineHeight: "1.5"}}>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>1. 인사말/지금의 나</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>2. 잊고 싶지 않은 생각</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>3. 내가 배운 것</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>4. 미래의 나에게 하고 싶은 말</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "0px" }}>5. 미래의 나에게 하는 약속</p>
        </div>
        <p style = {{ color: "darkred", fontSize: "16px", marginBottom: "-15px"}}> 30단어 이상을 작성한 후 '다음 순서로 넘어가기' 버튼을 누르면 다음 파트로 넘어갈 수 있습니다. 총 5개의 파트를 모두 마친 후 제출하기 버튼을 눌러주세요!</p>
      </div>

      {/* 실시간 반영 편지지 */}
      <div style={{
        width: "80%",
        marginLeft: "23px", 
        marginTop: "30px",
        marginBottom: "10px",
        padding: "15px",
        backgroundColor: "#f0f8ff",
        border: "1px solid #ddd",
        borderRadius: "5px",
        overflow: "visible", // 출력내용이 많아지면 자동으로 출력창 크기 조절
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "16px",
        }}>

        <strong>✏️ To. 미래의 나에게 </strong>
        <p>
          {currentSectionIndex < sectionTexts.length
            ? [...sectionTexts.slice(0, currentSectionIndex), currentInput]
            .filter(Boolean)
            .join("\n\n")
            : sectionTexts.join("\n")}
        </p>
      </div>

      
      {/* 텍스트 입력창 */}
      {currentSectionIndex < sections.length ? (
        <h3 className="section-title">
          {currentSectionIndex + 1}. {sections[currentSectionIndex]}
        </h3>
      ) : (
        <h3 className="section-title">
          ✉️ 편지 작성을 완료하셨습니다!
        </h3>
      )}

      {currentSectionIndex < sections.length && ( 
        <div style={{ width: "80%", textAlign: "left", fontSize: "18px" }}>
          <textarea
            style={{ width: "100%", height: "100px", padding: "10px", border: "1px solid #ccc", fontSize: "16px" }}
            value={isPreTextTyping ? preTextTyping : currentInput}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="여기에 글을 작성해주세요..."
            disabled={isInputDisabled}
          />
          {isInputDisabled && (
            <p style={{ color: "gray", fontWeight: "bold", fontSize: "14px", marginTop: "5px" }}>
              {preTextTyping.length < predefinedText.length
              ? "✨ DraftMind가 입력중입니다. 잠시만 기다려주세요..."
              : "🪄 DraftMind의 입력이 완료되었습니다!"}
            </p>
          )}
        </div>
      )}

      {/* 단어 수 및 경고 */}
      <div style={{ width: "80%", marginTop: "-15px"}}>
        {/* 단어 수 + 완료 메시지 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "10px", marginLeft: "10px", flexWrap: "wrap" }}>
          <p style={{
            color: currentWordCount >= 30 ? "green" : "black",
            fontWeight: currentWordCount >= 30 ? "bold" : "normal",
            fontSize: "16px",
            margin: 0
          }}>
            {currentWordCount}/30 단어
          </p>

          {currentWordCount >= 30 && (
            currentSectionIndex < sections.length - 1 ? (
            <>
              <p style={{
                color: "green",
                fontWeight: "bold",
                fontSize: "16px",
                margin: 0
              }}>
                ✅ 필요한 단어수가 채워졌습니다.
              </p>

              <button 
                onClick={handleNextSection}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
                style={{
                  padding: "5px 12px",
                  backgroundColor: isPressed ? "#4CAF50" : "#45a049",
                  color: "white",
                  border: "1px solid #3e8e41",
                  borderRadius: "4px",
                  marginTop: "10px",
                  fontSize: "15px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                다음 파트로 넘어가기
              </button>
            </>
            ) : (
            <p style={{
              color: "#007bff",
              fontWeight: "bold",
              fontSize: "16px",
              marginTop: "15px"
            }}>
              💡 편지에 필요한 내용이 모두 작성되었습니다! 아래 제출 버튼을 눌러주세요.
            </p>
            )
          )}
        </div>

        {/* warning 메시지 - 단어수 아래에 배치 */}
        {warning.length > 0 && (
          <div style={{ color: "red", fontWeight: "bold", fontSize: "16px", marginTop: "5px" }}>
            {warning.map((msg, index) => (
              <p key={index} style={{ margin: "4px 0" }}>❌ {msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* AI DraftMind의 출력이 나타나는 영역 */}
      {currentSectionIndex === 4 && (
        <div 
          style={{ 
            width: "78.5%",
            marginLeft: "21px", 
            marginTop: "10px",
            padding: "20px",
            border: "1px solid #ccc",
            backgroundColor: "#f9f9f9",
            textAlign: "left",
            overflow: "visible", // 출력내용이 많아지면 자동으로 출력창 크기 조절
            wordBreak: "break-word", // 긴 단어가 출력창을 넘어가면 줄바꿈
            whiteSpace: "pre-wrap", // \n을 줄바꿈으로 인식
            display: "flex",
            flexDirection: "column", // 제목, 설명, 본문을 세로 정렬
            alignItems: "center",
          }}>

          {/* 제목 */}
          <h2 style={{ marginTop: "-10px", textAlign: "center", fontSize: "30px", marginBottom: "-10px" }}> 
          <em>AI DraftMind</em>🪶
          </h2>
       
          {/* 설명 */}
          <p style={{marginBottom: "20px", fontSize: "16px", textAlign: "center", color: "gray" }}>
            DraftMind 는 당신이 작성한 글을 읽고, 당신의 글을 개선하는 데 도움을 주는 조언을 제공합니다.
          </p>

          {/* 본문 및 이미지 컨테이너 (병렬 배치) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >

          {/* AI 아이콘 (왼쪽) */}
          <img
            src="/images/DraftMind_image.png"
            alt="AI Icon"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%", // 원형 이미지
              marginRight: "15px", // 이미지와 본문 사이 간격
              objectFit: "cover",
            }}
          />

          {/* 본문 (오른쪽) */}
          <div style={{ flex:1 }}>
            {hasTriggeredOnce && displayText.trim() !== "" && 
              displayText
                .replaceAll(", ", ",\u00A0") // 쉼표 뒤 공백을 불간섭 공백으로 대체하여 줄바꿈 방지
                .split("\n")
                .map((line, index) => (
                  <p key={index} style={{ fontWeight: "bold", fontSize: "15px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {line}
                  </p>
                ))}
          </div>
        </div>
        </div>
      )}

    {/* ID 입력 + 제출 */}
    <div style={{ width: "80%", textAlign: "left", marginTop: "10px", marginBottom: "10px"}}>
      <label style={{ fontWeight: "bold", marginRight: "10px" }}>SONA ID:</label>
      <input
        type="text"
        value={prolificId}
        onChange={(e) => setProlificId(e.target.value)}
        placeholder="Enter your ID"
        style={{ padding: "5px", fontSize: "14px", width: "200px", marginRight: "15px"}}
      />

      <span style={{ fontSize: "16px", color: "gray" }}>
        참여 확인을 위해 SONA ID를 입력해주세요.
      </span>
    </div>

    <span style={{ marginTop: "10px", fontSize: "15px", color: "gray" }}>
    🔔제출버튼을 누르면 1~2초 후 제출이 완료되며, 자동으로 설문페이지로 넘어갑니다. 남은 설문을 완료해주세요.
    </span>

    {/* Submit 버튼 - 가장 아래로 배치 */}
    <button 
      onClick={handleSubmit} 
      style={{ 
        marginTop: "10px", padding: "12px 25px", backgroundColor: "#007bff", 
        color: "white", border: "none", cursor: "pointer", fontSize: "20px", fontWeight: "bold"
      }}>
      제출하기
    </button>

  </div>
  );
}