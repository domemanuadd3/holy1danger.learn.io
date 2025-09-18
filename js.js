  let currentWordIndex = 0;
        let completedWordsCount = 0;
        let dailyWords = [];
        let isAnswered = false;
        let allWords = [];
        let correctAnswers = 0;
        let timerInterval;

        // ฟังก์ชันสร้างรหัสรอบการเรียนรู้ (ใช้สำหรับเช็คเที่ยงวัน/เที่ยงคืน)
        function getCycleId() {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const cycle = now.getHours() >= 12 ? 'PM' : 'AM';
            return `${year}-${month}-${day}-${cycle}`;
        }

        // ฟังก์ชันตรวจสอบความคืบหน้าเมื่อโหลดหน้าเว็บ
        async function checkProgressOnLoad() {
            const currentCycleId = getCycleId();
            const savedData = JSON.parse(localStorage.getItem('dailyWordsData') || '{}');

            await fetchAllWords();

            if (savedData.cycleId === currentCycleId && savedData.words) {
                dailyWords = savedData.words;
                completedWordsCount = savedData.completed || 0;
                correctAnswers = savedData.score || 0;
                currentWordIndex = completedWordsCount;

                if (completedWordsCount >= 10) {
                    hideAllSections();
                    document.getElementById('appContent').style.display = 'block';
                    updateProgressAndScore();
                } else {
                    hideAllSections();
                    document.getElementById('continueSection').style.display = 'block';
                    document.getElementById('continueMessage').textContent =
                        `คุณทำไปแล้ว ${completedWordsCount} คำ จาก 10 คำ และทำคะแนนได้ ${correctAnswers} คะแนน`;
                }
            } else {
                // ผู้ใช้ใหม่หรือรอบใหม่
                hideAllSections();
                document.getElementById('startSection').style.display = 'block';
            }
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        }

        // ฟังก์ชันซ่อนหน้าจอทั้งหมด
        function hideAllSections() {
            document.getElementById('startSection').style.display = 'none';
            document.getElementById('continueSection').style.display = 'none';
            document.getElementById('appContent').style.display = 'none';
        }

        // ฟังก์ชันโหลดข้อมูลคำศัพท์ทั้งหมดจากไฟล์ Word.json
        async function fetchAllWords() {
            try {
                const response = await fetch('Word.json');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                
                if (!data.words || !Array.isArray(data.words)) {
                    throw new Error('Invalid JSON format: "words" key not found or is not an array.');
                }
                
                allWords = data.words;
            } catch (error) {
                console.error('Error fetching words:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาดในการโหลดไฟล์!',
                    html: `ไม่สามารถโหลดหรืออ่านไฟล์ ` + '`Word.json`' + ` ได้<br>โปรดตรวจสอบว่าไฟล์มีรูปแบบถูกต้อง`,
                    confirmButtonText: 'ตกลง'
                });
            }
        }
        
        // ฟังก์ชันเริ่มการทำงานของแอปทั้งหมด (สำหรับผู้ใช้ใหม่)
        async function startApp() {
            hideAllSections();
            document.getElementById('appContent').style.display = 'block';
            
            await generateDailyWords();
            displayCurrentWord();
        }

        // ฟังก์ชันดำเนินการต่อ (สำหรับผู้ใช้ที่ทำค้างไว้)
        function continueApp() {
            hideAllSections();
            document.getElementById('appContent').style.display = 'block';
            
            currentWordIndex = completedWordsCount;
            displayCurrentWord();
        }
        
        // ฟังก์ชันสุ่ม 10 คำจากข้อมูลทั้งหมด
        function getRandomWords(allWordsList) {
            const selected = [];
            const wordsCopy = [...allWordsList];
            while (selected.length < 10 && wordsCopy.length > 0) {
                const idx = Math.floor(Math.random() * wordsCopy.length);
                selected.push(wordsCopy[idx]);
                wordsCopy.splice(idx, 1);
            }
            return selected;
        }
        
        // ฟังก์ชันสุ่มคำแปลที่ไม่ถูกต้อง 3 คำ
        function getIncorrectMeanings(correctMeaning) {
            const allMeanings = allWords.map(word => word.meaning);
            
            const incorrectMeaningPool = allMeanings.filter(meaning => meaning !== correctMeaning);
            incorrectMeaningPool.sort(() => Math.random() - 0.5);

            return incorrectMeaningPool.slice(0, 3);
        }

        // ฟังก์ชันดึงคำศัพท์ 10 คำ
        async function generateDailyWords() {
            const currentCycleId = getCycleId();
            dailyWords = getRandomWords(allWords);
            completedWordsCount = 0;
            correctAnswers = 0;
            localStorage.setItem('dailyWordsData', JSON.stringify({
                cycleId: currentCycleId,
                words: dailyWords,
                completed: 0,
                score: 0
            }));
        }
        
        // ฟังก์ชันอัปเดตเวลา
        function updateTimer() {
            const now = new Date();
            let nextResetTime = new Date(now);

            if (now.getHours() < 12) {
                nextResetTime.setHours(12, 0, 0, 0);
            } else {
                nextResetTime.setHours(24, 0, 0, 0);
            }

            const timeLeft = nextResetTime - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            document.getElementById('timer').textContent =
                `รอบใหม่ใน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                checkProgressOnLoad();
            }
        }

        // ฟังก์ชันแสดงคำศัพท์และตัวเลือก
        function displayCurrentWord() {
            if (completedWordsCount >= 10) {
                updateProgressAndScore();
                return;
            }
            
            const word = dailyWords[currentWordIndex];
            if (!word) {
                document.getElementById('wordEnglish').textContent = 'ไม่พบข้อมูลคำศัพท์';
                return;
            }

            document.getElementById('wordEnglish').textContent = word.word;
            document.getElementById('wordPronunciation').textContent = `[${word.pronunciation}]`;
            
            const correctMeaning = word.meaning;
            const incorrectMeanings = getIncorrectMeanings(correctMeaning);
            const allOptions = [...incorrectMeanings, correctMeaning].sort(() => Math.random() - 0.5);

            const optionsContainer = document.getElementById('optionsContainer');
            optionsContainer.innerHTML = '';
            allOptions.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option;
                btn.onclick = () => checkAnswer(option);
                optionsContainer.appendChild(btn);
            });

            document.getElementById('showAnswerBtn').style.display = 'inline-block';
            document.getElementById('nextWordBtn').style.display = 'none';
            document.getElementById('answerContent').style.display = 'none';
            isAnswered = false;

            const progress = (completedWordsCount / 10) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
        }

        // ฟังก์ชันตรวจสอบคำตอบ
        function checkAnswer(selectedMeaning) {
            if (isAnswered) return;
            isAnswered = true;
            
            const currentWord = dailyWords[currentWordIndex];
            const correctWord = currentWord.word;
            const correctMeaning = currentWord.meaning;
            
            const isCorrect = (selectedMeaning === correctMeaning);
            if (isCorrect) {
                correctAnswers++;
            }
            
            Swal.fire({
                icon: isCorrect ? 'success' : 'error',
                title: isCorrect ? 'ถูกต้อง!' : 'ผิด!',
                html: `คำตอบที่ถูกต้องคือ <b>${correctWord}</b> แปลว่า "${correctMeaning}"`,
                confirmButtonText: 'ตกลง'
            }).then(() => {
                nextWord();
            });
        }

        // ฟังก์ชันแสดงเฉลย
        function showAnswer() {
            const currentWord = dailyWords[currentWordIndex];
            const correctWord = currentWord.word;
            const correctMeaning = currentWord.meaning;
            
            Swal.fire({
                icon: 'info',
                title: 'คำตอบที่ถูกต้องคือ...',
                html: `คำตอบคือ <b>${correctWord}</b> แปลว่า "${correctMeaning}"`,
                confirmButtonText: 'ตกลง'
            }).then(() => {
                nextWord();
            });
        }

        // ฟังก์ชันไปคำถัดไป
        function nextWord() {
            completedWordsCount++;
            currentWordIndex = (currentWordIndex + 1);
            
            const currentCycleId = getCycleId();
            localStorage.setItem('dailyWordsData', JSON.stringify({
                cycleId: currentCycleId,
                words: dailyWords,
                completed: completedWordsCount,
                score: correctAnswers
            }));
            
            displayCurrentWord();
        }
        
        // ฟังก์ชันอัปเดตความคืบหน้าและคะแนนเมื่อเรียนจบ
        function updateProgressAndScore() {
            document.getElementById('progressFill').style.width = '100%';
            
            document.getElementById('wordCard').style.display = 'none';
            document.getElementById('completedMessage').style.display = 'block';
            document.getElementById('scoreMessage').textContent = `คุณทำคะแนนได้ ${correctAnswers} จาก 10 คำ!`;
        }
        
        // ฟังก์ชันรีเซ็ตความคืบหน้าในรอบปัจจุบัน (ปุ่มเริ่มใหม่)
        function resetProgress() {
            localStorage.removeItem('dailyWordsData');
            location.reload(); // โหลดหน้าใหม่เพื่อให้ทุกอย่างกลับไปที่สถานะเริ่มต้น
        }