document.addEventListener('DOMContentLoaded', async function() {
    const statusMessageElement = document.getElementById('status-message');
    const pageWrapper = document.querySelector('.page-wrapper');
    const tocPanel = document.querySelector('.toc-panel');
    const contentPanel = document.querySelector('.content-panel');
    const documentListUl = document.getElementById('document-list-ul');
    const currentDocTocUl = document.getElementById('current-document-toc-ul');
    const documentTitleH1 = document.getElementById('document-title-h1');
    const documentContentDiv = document.getElementById('document-content-div');

    let documentsData = []; // { id, filename, markdownContent (загружается по клику) }
    let currentLoadedDocId = null;
    let toggleButton = null;

    const markdownFilesPath = '/markdown_files/';

    function slugify(text) {
        if (!text) return 'default-doc';
        // Добавляем префикс, если текст начинается с цифры
        text = text.toString().toLowerCase().trim()
            .replace(/\.md$/i, '')
            .replace(/^(\d)/, 'n$1') // Добавляем 'n' перед цифрой в начале
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        return text || 'document-' + Date.now();
    }

    async function fetchMarkdownContent(filename) {
        try {
            const fullPath = markdownFilesPath + filename;
            console.log('Fetching markdown from:', fullPath);
            
            const response = await fetch(fullPath);
            if (!response.ok) {
                console.error('Fetch error:', response.status, response.statusText);
                throw new Error(`Ошибка загрузки файла ${filename}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Fetch failed:', error);
            statusMessageElement.textContent = `Ошибка: ${error.message}`;
            return null;
        }
    }

    function buildTocFromRenderedHtml(htmlContainer, docIdPrefix) {
        currentDocTocUl.innerHTML = "";
        const tocStructure = [];
        let headingCounter = 0;

        // Ищем все элементы li с strong внутри
        const listItems = htmlContainer.querySelectorAll('li');
        
        Array.from(listItems).forEach(li => {
            const strongEl = li.querySelector('strong');
            if (strongEl) {
                const text = strongEl.textContent.trim();
                if (text) {
                    headingCounter++;
                    const anchorId = `${docIdPrefix}-item-${headingCounter}-${slugify(text)}`;
                    li.id = anchorId;

                    const tocEntry = {
                        id: anchorId,
                        text: text,
                        level: 1,
                        children: []
                    };
                    tocStructure.push(tocEntry);
                }
            }
        });

        buildTocRecursive(currentDocTocUl, tocStructure);
    }

    // Удален лишний код (headings.forEach и т.д.), который был здесь

    const buildTocRecursive = (parentElement, items) => {
        parentElement.innerHTML = '';
        items.forEach((item) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${item.id}`;
            a.textContent = item.text;
            a.classList.add(`toc-level-${item.level}`);
            li.appendChild(a);
            if (item.children && item.children.length > 0) {
                const subUl = document.createElement('ul');
                buildTocRecursive(subUl, item.children); // Рекурсивный вызов себя же
                li.appendChild(subUl);
            }
            parentElement.appendChild(li);
        });
    };

    // Удалена дублирующая функция buildTocRecursiveJs

    async function loadDocument(filename) { // Эта версия функции будет использоваться
        const docId = slugify(filename);
        const docData = documentsData.find(d => d.filename === filename);
        if (!docData) {
            documentTitleH1.textContent = "Документ не найден";
            documentContentDiv.innerHTML = "";
            currentDocTocUl.innerHTML = "";
            return;
        }

        statusMessageElement.textContent = `Загрузка документа: ${docData.filename}...`;
        pageWrapper.style.display = 'none';

        const markdownContent = await fetchMarkdownContent(docData.filename);
        if (markdownContent === null) {
            documentTitleH1.textContent = `Ошибка загрузки: ${docData.filename}`;
            documentContentDiv.innerHTML = `<p style="color:red;">Не удалось загрузить содержимое файла.</p>`;
            currentDocTocUl.innerHTML = "";
            statusMessageElement.textContent = `Ошибка загрузки файла.`;
            pageWrapper.style.display = 'flex';
            return;
        }

        docData.markdownContent = markdownContent;

        const htmlContent = marked.parse(markdownContent, {
            gfm: true,
            breaks: false,
            smartLists: true,
            smartypants: true,
            headerIds: false // Отключаем автоматические ID для заголовков
        });
        documentContentDiv.innerHTML = htmlContent;

        const tempDivForTitle = document.createElement('div');
        tempDivForTitle.innerHTML = htmlContent;
        
        let displayTitle = "";
        const firstH2InContent = tempDivForTitle.querySelector('h2');
        
        if (firstH2InContent && firstH2InContent.textContent.trim()) {
            displayTitle = firstH2InContent.textContent.trim();
        } else {
            displayTitle = docData.filename.replace(/\.md$/i, '');
        }

        documentTitleH1.textContent = displayTitle;
        document.title = `Просмотр: ${displayTitle}`; // Исправлено: documentTitle -> displayTitle

        console.log('Building TOC from rendered HTML...');
        buildTocFromRenderedHtml(documentContentDiv, docId);
        console.log('TOC built:', currentDocTocUl.innerHTML);

        setupTocInteraction();
        contentPanel.scrollTop = 0;
        currentLoadedDocId = docId;

        document.querySelectorAll('#document-list-ul li').forEach(li => {
            li.classList.remove('active');
            if (li.dataset.docId === docId) {
                li.classList.add('active');
            }
        });
        statusMessageElement.textContent = "";
        pageWrapper.style.display = 'flex';
    }

    let sectionsCache = [];
    let tocLinksCache = [];

    function setupTocInteraction() {
        tocLinksCache = currentDocTocUl.querySelectorAll('a');
        sectionsCache = [];
        tocLinksCache.forEach(link => {
            try {
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) sectionsCache.push(targetElement);
            } catch (e) { console.warn("Ошибка TOC:", link.getAttribute('href'), e); }
        });

        tocLinksCache.forEach(anchor => {
            const newAnchor = anchor.cloneNode(true);
            anchor.parentNode.replaceChild(newAnchor, anchor);
            newAnchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                try {
                    const targetElement = document.getElementById(targetId.substring(1));
                    if (targetElement) {
                        contentPanel.scrollTo({top: targetElement.offsetTop - 20, behavior: 'smooth'});
                    } else { console.warn("Цель не найдена:", targetId); }
                } catch (e) { console.warn("Ошибка прокрутки:", targetId, e); }
            });
        });
        tocLinksCache = currentDocTocUl.querySelectorAll('a');
        updateActiveTocLink();
    }

    function updateActiveTocLink() {
        if (!sectionsCache.length || !tocLinksCache.length) return;
        let currentSectionId = '';
        const scrollPosition = contentPanel.scrollTop;
        sectionsCache.forEach(section => {
            if (section.offsetTop <= scrollPosition + 60) currentSectionId = section.getAttribute('id');
        });
        tocLinksCache.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) link.classList.add('active');
        });
    }

    if (contentPanel) contentPanel.addEventListener('scroll', updateActiveTocLink);

    function populateDocumentList(filenames) {
        documentListUl.innerHTML = "";
        documentsData = filenames.map(filename => ({
            filename: filename
        }));

        documentsData.sort((a,b) => a.filename.localeCompare(b.filename));

        documentsData.forEach(doc => {
            const li = document.createElement('li');
            li.textContent = doc.filename.replace(/\.md$/i, '');
            li.dataset.docId = slugify(doc.filename);
            li.title = doc.filename;
            li.addEventListener('click', () => {
                console.log(`Запрошен документ с filename: ${doc.filename}`);
                loadDocument(doc.filename);
                if (window.innerWidth <= 768 && toggleButton) {
                    tocPanel.style.display = 'none';
                    tocPanel.classList.remove('mobile-toc-visible');
                    toggleButton.textContent = '≡ Меню';
                }
            });
            documentListUl.appendChild(li);
        });
    }

    function createAndSetupToggleButton() {
        if (toggleButton) {
             try { document.body.removeChild(toggleButton); } catch(e){}
        }
        const button = document.createElement('button');
        button.textContent = '≡ Меню';
        button.classList.add('toggle-toc-button');
        const statusContainer = document.querySelector('.status-container');
        if (statusContainer && statusContainer.nextSibling) {
            document.body.insertBefore(button, statusContainer.nextSibling);
        } else {
            document.body.appendChild(button);
        }

        button.addEventListener('click', function() {
            if (getComputedStyle(tocPanel).display === 'none') {
                tocPanel.style.display = 'flex';
                tocPanel.classList.add('mobile-toc-visible');
                button.textContent = '× Закрыть';
            } else {
                tocPanel.style.display = 'none';
                tocPanel.classList.remove('mobile-toc-visible');
                button.textContent = '≡ Меню';
            }
        });
        return button;
    }

    function checkScreenSizeForMobileMenu() {
        if (!toggleButton) return;
        if (window.innerWidth <= 768) {
            toggleButton.style.display = 'block';
            if (getComputedStyle(tocPanel).display !== 'none' && !tocPanel.classList.contains('mobile-toc-visible')) {
                 tocPanel.style.display = 'none';
                 toggleButton.textContent = '≡ Меню';
            } else if (tocPanel.classList.contains('mobile-toc-visible')) {
                toggleButton.textContent = '× Закрыть';
            } else {
                toggleButton.textContent = '≡ Меню';
            }
        } else {
            toggleButton.style.display = 'none';
            tocPanel.style.display = 'flex';
            tocPanel.classList.remove('mobile-toc-visible');
        }
    }

    async function fetchMarkdownFilesList() {
        try {
            const response = await fetch('files.json');
            if (!response.ok) {
                throw new Error('Ошибка получения списка файлов');
            }
            const data = await response.json();
            return data.files;
        } catch (error) {
            console.error('Ошибка при загрузке files.json:', error);
            return [];
        }
    }

    async function initializeApp() {
        const filenames = await fetchMarkdownFilesList();
        if (filenames && filenames.length > 0) {
            populateDocumentList(filenames);
            // Сразу открываем первый документ
            loadDocument(filenames[0]);
            statusMessageElement.textContent = '';
        } else {
            // Обработка случая, если файлов нет
            statusMessageElement.textContent = 'Нет доступных документов.';
            pageWrapper.style.display = 'none';
        }
    }

    initializeApp();
});