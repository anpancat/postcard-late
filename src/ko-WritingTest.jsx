import { useState, useEffect } from "react";
import { db, collection, addDoc } from "./firebaseConfig"; // firebase 인증 모듈 불러오기

const getReturnURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("return") || "https://kupsychology.qualtrics.com/jfe/form/SV_0dq8or8LplYSVee";
};

export default function WritingTest() {
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const requiredWords = ["친구", "놀란", "강아지"];
  const [displayText, setDisplayText] = useState("");
  const predefinedText = "따스한 햇살이 골목길을 비추고, 나뭇잎 사이로 부는 바람이 잔잔한 소리를 냈다. 담벼락에는 고양이가 졸고 있었고, 창문 너머로 김이 서린 찻잔이 보였다. 조용한 거리에 어울리지 않게 어디선가 작은 발소리가 들려오고, 고개를 들어 소리가 난 곳을 찾아 두리번거리자 멀리서 낯선 그림자를 발견했다. "; // 미리 정해진 문장 삽입
  const [preTextIndex, setPreTextIndex] = useState(0);
  const [isPreTextTyping, setIsPreTextTyping] = useState(""); // 타이핑 중인 글자 저장
  const [preTextTyping, setPreTextTyping] = useState("");   // 타이핑 중인 글자
  const [originalText, setOriginalText] = useState("");     // 기존 작성 글 보존

  const typingText = "...DraftMind가 입력중 입니다..."; //입력중
  const hello = "안녕하세요! 저는 글쓰기를 도와주기 위해 만들어진 AI 'DraftMind'입니다. \n당신은 지금 이야기를 창작중인 것으로 보이네요. 당신의 글쓰기를 돕게 되어 기뻐요!"; // 인사말
  const level = "통상적인 글쓰기 원칙과 스토리텔링 전략에 기반하여, 일반적인 글쓰기 상황에 적용될만한 도움을 제공해드릴게요."; // 개인화 수준 명시(낮은 개인화)
  const fullText = "스토리를 더욱 몰입감 있게 만들기 위해서는 서두를 좀 더 자세히 묘사하는 것이 도움이 됩니다. 그렇게 하면 이야기의 몰입감이 올라갈 거예요.\n예시 문장을 드릴 테니 참고해보세요!"; // AI 글쓰기 제안문구
  const examplePhrase = ["따스한 햇살이", "골목길을 비추고", "나뭇잎 사이로 부는 바람이", "잔잔한 소리를 냈다", "담벼락에는 고양이가 졸고 있었고", "창문 너머로", "김이 서린 찻잔이 보였다", "조용한 거리에", "어울리지 않게", "어디선가 작은 발소리가 들려오고", "고개를 들어", "소리가 난 곳을 찾아 두리번거리자", "멀리서 낯선 그림자를 발견했다"];  // 예시 구문들
  const exampleKeywords = ["따스한", "햇살", "골목길", "비추고", "나뭇잎", "사이", "부는", "바람", "잔잔한", "소리", "냈다", "담벼락", "고양이", "졸고", "있었고", "창문", "너머", "김", "서린", "찻잔", "보였다", "조용한", "거리", "어울리지", "않게", "어디선가", "작은", "발소리", "들려오고", "고개", "들어", "소리", "난", "곳", "찾아", "두리번거리자", "멀리서", "낯선", "그림자", "발견했다"]; // 예시 단어들

  const [typingIndex, setTypingIndex] = useState(0);
  const [helloIndex, setHelloIndex] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);

  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isHelloTyping, setIsHelloTyping] = useState(false);
  const [isLevelTyping, setIsLevelTyping] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false);

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showInputLockMessage, setShowInputLockMessage] = useState(false);

  const [warning, setWarning] = useState("");
  const [missingWords, setMissingWords] = useState([]);

  // ✨ Prolific ID 상태 추가
  const [prolificId, setProlificId] = useState("");

  // 🔥 입력 잠금 메시지 상태 추가
  useEffect(() => {
    setShowInputLockMessage(isInputDisabled);
  }, [isInputDisabled]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열
  
    // 🔥 단어 수 계산 (입력된 텍스트가 비어있으면 0으로 설정)
    let words = newText.trim().length === 0 ? [] : newText.trim().split(/\s+/);
  
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
      }
  
    } 
      setWordCount(words.length); // 1단어만 입력되었을 때도 정상적으로 카운트
    
  
    // 🔥 필수 단어 포함 여부 확인
    const rootWords = ["친구", "놀란", "강아지들"];
    const missing = rootWords.filter((requiredRoot) =>
      !words.some((w) => w.replace(/[.,!?]/g, "").includes(requiredRoot)) // 🔥 문장부호 제거 후 비교
    );
  
    setMissingWords(missing);

    if (missing.length > 0) {
      warningMessages.push(`다음 제시어가 반드시 들어가야 합니다: ${missing.join(", ")}`);
    }
  
    // 🔥 중복 제거 후 경고 메시지 설정
    setWarning([...new Set(warningMessages)]);
  };
  

  useEffect(() => {
    if (wordCount >= 20 && !hasTriggeredOnce) {
      setIsInputDisabled(true); // ✅ 입력창 비활성화 추가

      setDisplayText("");
      setTypingIndex(0);
      setHelloIndex(0);
      setLevelIndex(0);
      setFullTextIndex(0);

      setIsTypingTextComplete(false);
      setIsHelloTyping(false);
      setIsLevelTyping(false);
      setIsFullTextTyping(false);

      setHasTriggeredOnce(true);
    }
  }, [wordCount, hasTriggeredOnce, text]);

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
        setIsLevelTyping(true);
      }, 2000);
    }
  }, [helloIndex, isHelloTyping]);

  // 개인화 수준 타이핑효과
  useEffect(() => {
    if (isLevelTyping && levelIndex < level.length) {
      const timer = setTimeout(() => {
        setDisplayText(level.slice(0, levelIndex + 1));
        setLevelIndex(levelIndex + 1);
      }, 35);
      return () => clearTimeout(timer);
    }

    if (levelIndex === level.length) {
      setTimeout(() => {
        setDisplayText(""); // 다음 메시지 시작 전 초기화
        setIsLevelTyping(false);
        setIsFullTextTyping(true);
      }, 2000);
    }
  }, [levelIndex, isLevelTyping]);

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
    // 타이핑 시작 시점에 기존 글 저장
    if (isPreTextTyping && preTextIndex === 0) {
      setOriginalText(text);
    }

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
        if (!originalText.startsWith(predefinedText)) {
          setText(predefinedText + originalText);   // 최종 텍스트 반영
        } else {
          setText(originalText);   // 이미 삽입된 경우 유지
        }

        // ✅ 여기서 단어 수 갱신
        const finalText = !originalText.startsWith(predefinedText)
          ? predefinedText + originalText
          : originalText;

        const words = finalText.trim().split(/\s+/);
        setText(finalText); // 최종 텍스트 반영
        setWordCount(words.length);

        setIsPreTextTyping(false);
        setIsInputDisabled(false);   // 타이핑 끝난 후 입력창 활성화
      }, 1000);
    }
  }, [isPreTextTyping, preTextIndex]);
  


  // 🔥 Firestore에 데이터 저장하는 함수 추가
  const handleSubmit = async () => {
    let errorMessages = []; 

    // 단어 수 체크
    if (wordCount < 100) {
      errorMessages.push("❌ 단어 수가 부족합니다 (최소 100 단어).");
    }
    if (wordCount > 150) {
      errorMessages.push("❌ 단어 수가 초과되었습니다 (최대 150 단어).");
    }


    // 필수 단어 포함 여부 확인
    if (missingWords.length > 0) {
      errorMessages.push(`❌ 다음 제시어가 반드시 들어가야 합니다: ${missingWords.join(", ")}`);
    }

    // ✨ Qualtrics ID 미입력 시 에러 메시지 추가
    if (!prolificId.trim()) {
      errorMessages.push("❌ SONA ID를 적어주세요.");
    }


    // 🔥 오류 메시지가 하나라도 있으면 제출 불가
    if (errorMessages.length > 0) {
      alert(`⚠️ 다음과 같은 이유로 제출이 실패되었습니다:\n\n${errorMessages.join("\n")}`);
      return;
    }

    try {
      // 예시 구문 매칭 개수 및 비율 계산
      const matchedPhrase = examplePhrase.filter(phrase => text.trim().includes(phrase)); // 대소문자 구분없이 매칭
      const examplePhraseCount = matchedPhrase.length; // 예시구문 매칭 개수
      const examplePhraseRatio = +(examplePhraseCount / examplePhrase.length).toFixed(2); // 예시구문 반영비율

      //예시 단어 매칭 개수 및 비율 계산
      const textWords = text.trim().match(/[가-힣]+/g) || [];
      const matchedWords = exampleKeywords.filter(keyword =>
        textWords.some(word => word.includes(keyword))
      );

      const exampleWordCount = matchedWords.length; // 예시단어 매칭 개수
      const exampleWordRatio = +(exampleWordCount / exampleKeywords.length).toFixed(2); // 예시단어 반영비율

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
      await addDoc(collection(db, "K-writingData"), {
        SONAId: prolificId.trim(), // ✨ prolific ID 저장
        text: text.trim(),
        wordCount: wordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        exampleWordCount: exampleWordCount, // 예시단어 매칭개수
        exampleWordRatio: exampleWordRatio, // 예시단어 매칭비율
        exampleWords: matchedWords.join(", "), // 예시단어 매칭된 단어들
        examplePhraseCount: examplePhraseCount, // 예시구문 매칭개수
        examplePhraseRatio: examplePhraseRatio, // 예시구문 매칭비율
        examplePhrases: matchedPhrase.join(", ") // 예시구문 매칭된 구문들
      });

      alert("✅ 작성하신 글이 성공적으로 제출되었습니다!");
      setText("");
      setWordCount(0);
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
          
      {/* 사용자가 글 작성하는 영역 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "10px", fontSize: "18px" }}> 
        <h1>📝 짧은 글 짓기</h1>
        <p>아래 프롬프트에 한글로 이야기를 작성해주세요 (100-150 단어) 다음 제시어를 포함해야 합니다:</p>
        <p style={{ color: "red", fontWeight: "bold", fontSize: "20px" }}>{requiredWords.join(", ")}</p>
        <p className="mt-2">단어 수: {wordCount}</p>

        <textarea
          style={{ width: "100%", height: "200px", padding: "10px", border: "1px solid #ccc", fontSize: "16px" }}
          value={isPreTextTyping ? preTextTyping + originalText : text}
          onChange={(e) => handleChange(e)}
          placeholder="여기에 글을 작성해주세요..."
          disabled={isInputDisabled} // ✅ 비활성화 반영
        />

        {showInputLockMessage && (
          <p style={{ color: "gray", fontWeight: "bold", fontSize: "14px", marginTop: "5px" }}>
            ✨ DraftMind가 입력중입니다. 잠시만 기다려주세요...
          </p>
        )}
      </div>

      {/* ✨ Prolific ID 입력 필드 추가 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "10px"}}>
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


      {/* AI DraftMind의 출력이 나타나는 영역 */}
      <div 
        style={{ 
          width: "78.5%",
          marginLeft: "21px", 
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
        <h2 style={{ marginTop: "3px", textAlign: "center", fontSize: "30px" }}> 
          <em>AI DraftMind</em>🪶
        </h2>
       
        {/* 설명 */}
        <p style={{marginTop: "0px", marginBottom: "30px", fontSize: "16px", textAlign: "center", color: "gray" }}>
          DraftMind 는 당신이 작성한 글을 읽고, 당신의 글을 개선하는 데 도움을 주는 조언을 제공합니다.
        </p>

        {/* 본문 및 이미지 컨테이너 (병렬 배치) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            marginTop: "10px",
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
                <p key={index} style={{ fontWeight: "bold", fontSize: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {line}
                </p>
              ))}
        </div>
      </div>
      </div>
      {/* 경고 메시지 출력 */}
      {warning.length > 0 && (
          <div style={{ color: "red", fontWeight: "bold", fontSize: "16px", marginTop: "10px" }}>
            {warning.map((msg, index) => (
              <p key={index} style={{ margin: "5px 0" }}>❌ {msg}</p>
            ))}
          </div>
        )}

      <span style={{ marginTop: "10px", fontSize: "18px", color: "gray" }}>
      🔔글을 제출한 후 반드시 설문을 완료해주세요.
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