// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 전역 변수
let pdfDoc = null;
let currentPageNum = 1;
let totalPages = 0;
let swipeInstance = null;
let isRendering = false;

// DOM 요소
const swipeContainer = document.getElementById('swipe-container');
const swipeWrapper = document.getElementById('swipe-wrapper');
const loading = document.getElementById('loading');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// PDF 파일 경로
const pdfPath = './Good News For Sudanese (Free PDF).pdf';

// PDF 로드
async function loadPDF() {
    try {
        loading.classList.remove('hidden');
        
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        totalPagesSpan.textContent = totalPages;
        
        // 모든 페이지 렌더링
        await renderAllPages();
        
        // Swipe.js 초기화
        initSwipe();
        
        // 버튼 이벤트 리스너
        setupEventListeners();
        
        loading.classList.add('hidden');
    } catch (error) {
        console.error('PDF 로드 오류:', error);
        loading.innerHTML = '<p style="color: red;">PDF를 불러올 수 없습니다: ' + error.message + '</p>';
    }
}

// 모든 페이지 렌더링
async function renderAllPages() {
    swipeWrapper.innerHTML = '';
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // 캔버스 생성
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.className = 'page-canvas';
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // 페이지 슬라이드 컨테이너 생성
        const slide = document.createElement('div');
        slide.className = 'page-slide';
        slide.appendChild(canvas);
        swipeWrapper.appendChild(slide);
        
        // 페이지 렌더링
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
    }
}

// 커스텀 Swipe 기능 초기화
function initSwipe() {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let currentIndex = 0;
    
    // CSS transform으로 슬라이드 이동
    function moveToSlide(index) {
        if (index < 0 || index >= totalPages) return;
        currentIndex = index;
        currentPageNum = index + 1;
        swipeWrapper.style.transform = `translateX(-${index * 100}%)`;
        updatePageInfo();
        updateNavButtons();
    }
    
    // 마우스 이벤트
    swipeContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        swipeContainer.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - startX;
        const offset = currentIndex * -100 + (currentX / swipeContainer.offsetWidth) * 100;
        swipeWrapper.style.transition = 'none';
        swipeWrapper.style.transform = `translateX(${offset}%)`;
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        swipeContainer.style.cursor = 'grab';
        swipeWrapper.style.transition = 'transform 0.3s ease';
        
        const threshold = 0.3; // 30% 이상 드래그하면 페이지 전환
        const dragRatio = Math.abs(currentX) / swipeContainer.offsetWidth;
        
        if (dragRatio > threshold) {
            if (currentX > 0 && currentIndex > 0) {
                moveToSlide(currentIndex - 1);
            } else if (currentX < 0 && currentIndex < totalPages - 1) {
                moveToSlide(currentIndex + 1);
            } else {
                moveToSlide(currentIndex);
            }
        } else {
            moveToSlide(currentIndex);
        }
        currentX = 0;
    });
    
    // 터치 이벤트
    let touchStartX = 0;
    let touchCurrentX = 0;
    
    swipeContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        swipeWrapper.style.transition = 'none';
    }, { passive: true });
    
    swipeContainer.addEventListener('touchmove', (e) => {
        touchCurrentX = e.touches[0].clientX;
        const diff = touchCurrentX - touchStartX;
        const offset = currentIndex * -100 + (diff / swipeContainer.offsetWidth) * 100;
        swipeWrapper.style.transform = `translateX(${offset}%)`;
    }, { passive: true });
    
    swipeContainer.addEventListener('touchend', () => {
        swipeWrapper.style.transition = 'transform 0.3s ease';
        const diff = touchCurrentX - touchStartX;
        const threshold = swipeContainer.offsetWidth * 0.3;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentIndex > 0) {
                moveToSlide(currentIndex - 1);
            } else if (diff < 0 && currentIndex < totalPages - 1) {
                moveToSlide(currentIndex + 1);
            } else {
                moveToSlide(currentIndex);
            }
        } else {
            moveToSlide(currentIndex);
        }
        touchStartX = 0;
        touchCurrentX = 0;
    }, { passive: true });
    
    // 초기 설정
    swipeContainer.style.cursor = 'grab';
    moveToSlide(0);
    
    // 공개 API
    swipeInstance = {
        next: () => moveToSlide(currentIndex + 1),
        prev: () => moveToSlide(currentIndex - 1),
        slide: (index) => moveToSlide(index)
    };
}

// 이벤트 리스너 설정
function setupEventListeners() {
    prevBtn.addEventListener('click', () => {
        if (currentPageNum > 1) {
            swipeInstance.prev();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentPageNum < totalPages) {
            swipeInstance.next();
        }
    });
    
    // 키보드 네비게이션
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentPageNum > 1) {
            swipeInstance.prev();
        } else if (e.key === 'ArrowRight' && currentPageNum < totalPages) {
            swipeInstance.next();
        }
    });
    
    // 터치 제스처 (추가 지원)
    let touchStartX = 0;
    let touchEndX = 0;
    
    swipeContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    swipeContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentPageNum < totalPages) {
                // 왼쪽으로 스와이프 (다음 페이지)
                swipeInstance.next();
            } else if (diff < 0 && currentPageNum > 1) {
                // 오른쪽으로 스와이프 (이전 페이지)
                swipeInstance.prev();
            }
        }
    }
}

// 페이지 정보 업데이트
function updatePageInfo() {
    currentPageSpan.textContent = currentPageNum;
}

// 네비게이션 버튼 업데이트
function updateNavButtons() {
    prevBtn.disabled = currentPageNum === 1;
    nextBtn.disabled = currentPageNum === totalPages;
}

// 컨테이너에 포커스 (키보드 이벤트를 위해)
swipeContainer.setAttribute('tabindex', '0');

// PDF 로드 시작
loadPDF();
