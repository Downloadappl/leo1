(() => {
  const UNIVERSITY_DATA_URL = './assets/universities_links.json';
  let universitiesPromise;
  let activePopoverClose = null;

  function loadUniversities() {
    if (!universitiesPromise) {
      universitiesPromise = fetch(UNIVERSITY_DATA_URL, { cache: 'force-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`University list request failed (${response.status})`);
          return response.json();
        })
        .then(data => {
          if (!Array.isArray(data)) throw new Error('University list has an invalid format');
          const seen = new Set();
          return data.filter(item => {
            if (!item || typeof item.name !== 'string' || !item.name.trim()) return false;
            const key = item.name.trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).map(item => ({
            name: item.name.trim(),
            image_url: typeof item.image_url === 'string' && item.image_url.startsWith('https://')
              ? item.image_url
              : ''
          }));
        })
        .catch(error => {
          console.warn('Could not load university list:', error);
          return [];
        });
    }
    return universitiesPromise;
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function movePopover(menu, anchor, restoreParent, onClose) {
    if (activePopoverClose) activePopoverClose();

    let isClosed = false;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 10;
      const above = rect.top - 10;
      const openAbove = below < 190 && above > below;
      const available = Math.max(120, Math.min(360, openAbove ? above : below));
      menu.style.left = `${Math.max(8, rect.left)}px`;
      menu.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
      menu.style.maxHeight = `${available}px`;
      menu.style.top = openAbove
        ? `${Math.max(8, rect.top - Math.min(menu.scrollHeight, available) - 7)}px`
        : `${rect.bottom + 7}px`;
    };
    const close = () => {
      if (isClosed) return;
      isClosed = true;
      menu.hidden = true;
      menu.removeAttribute('data-portal');
      menu.style.cssText = '';
      restoreParent.appendChild(menu);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      if (activePopoverClose === close) activePopoverClose = null;
      if (typeof onClose === 'function') onClose();
    };

    menu.hidden = false;
    menu.dataset.portal = 'true';
    document.body.appendChild(menu);
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    activePopoverClose = close;
    return close;
  }

  function makeLogo(imageUrl, name, className, lazy = true) {
    const box = document.createElement('span');
    box.className = className;
    box.setAttribute('aria-hidden', 'true');

    const fallback = document.createElement('span');
    fallback.textContent = Array.from(name.trim())[0] || 'ج';
    box.appendChild(fallback);

    if (imageUrl) {
      const image = document.createElement('img');
      image.alt = '';
      image.loading = lazy ? 'lazy' : 'eager';
      image.decoding = 'async';
      image.hidden = true;
      image.addEventListener('load', () => {
        image.hidden = false;
        fallback.hidden = true;
      });
      image.addEventListener('error', () => {
        image.hidden = true;
        fallback.hidden = false;
      });
      image.src = imageUrl;
      box.appendChild(image);
    }
    return box;
  }

  function initUniversityPicker(root) {
    const input = root.querySelector('[data-university-input]');
    const menu = root.querySelector('[data-university-menu]');
    const toggle = root.querySelector('[data-university-toggle]');
    const control = root.querySelector('.university-picker-control');
    const selectedLogo = root.querySelector('[data-university-selected-logo]');
    const selectedImage = root.querySelector('[data-university-selected-image]');
    const selectedFallback = root.querySelector('[data-university-selected-fallback]');
    if (!input || !menu || !control || !toggle) return;

    let universities = [];
    let closeMenu = null;
    let activeIndex = -1;

    const optionButtons = () => Array.from(menu.querySelectorAll('[data-university-option]'));
    const syncExpanded = expanded => {
      input.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-expanded', String(expanded));
    };

    const updateSelectedLogo = () => {
      const current = normalizeSearchText(input.value);
      const match = universities.find(item => normalizeSearchText(item.name) === current);
      selectedLogo.hidden = !match;
      if (!match) {
        selectedImage.hidden = true;
        selectedFallback.hidden = false;
        selectedImage.removeAttribute('src');
        return;
      }

      selectedFallback.textContent = Array.from(match.name)[0] || 'ج';
      selectedFallback.hidden = false;
      selectedImage.hidden = true;
      selectedImage.onload = () => {
        selectedImage.hidden = false;
        selectedFallback.hidden = true;
      };
      selectedImage.onerror = () => {
        selectedImage.hidden = true;
        selectedFallback.hidden = false;
      };
      if (match.image_url) selectedImage.src = match.image_url;
      else selectedImage.removeAttribute('src');
    };

    const selectUniversity = (name, dispatch = true) => {
      input.value = name;
      updateSelectedLogo();
      if (dispatch) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (closeMenu) closeMenu();
      closeMenu = null;
      activeIndex = -1;
      syncExpanded(false);
    };

    const createOption = (university, index, isCustom = false) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `university-picker-option${isCustom ? ' university-picker-option-custom' : ''}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(normalizeSearchText(input.value) === normalizeSearchText(university.name)));
      option.tabIndex = -1;
      option.dataset.universityOption = 'true';
      option.dataset.optionIndex = String(index);
      if (!isCustom) {
        option.appendChild(makeLogo(university.image_url, university.name, 'university-picker-option-logo', index >= 8));
      }

      const name = document.createElement('span');
      name.className = 'university-picker-option-name';
      name.textContent = isCustom ? `استخدام الاسم المكتوب: ${university.name}` : university.name;
      option.appendChild(name);
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => selectUniversity(university.name));
      option.addEventListener('mousemove', () => setActive(index));
      return option;
    };

    function setActive(index) {
      const options = optionButtons();
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach((option, optionIndex) => option.classList.toggle('is-active', optionIndex === activeIndex));
      input.setAttribute('aria-activedescendant', options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    const renderOptions = () => {
      const query = normalizeSearchText(input.value);
      const matches = universities.filter(item => !query || normalizeSearchText(item.name).includes(query));
      menu.replaceChildren();
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');

      const header = document.createElement('div');
      header.className = 'university-picker-menu-header';
      header.textContent = query ? `${matches.length} جامعة أو معهد` : `${universities.length} جامعة ومعهد — اكتب للبحث`;
      menu.appendChild(header);

      matches.forEach((item, index) => menu.appendChild(createOption(item, index)));
      const exactMatch = universities.some(item => normalizeSearchText(item.name) === query);
      if (query && !exactMatch) {
        menu.appendChild(createOption({ name: input.value.trim(), image_url: '' }, matches.length, true));
      } else if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'university-picker-empty';
        empty.textContent = 'اكتب اسم الجامعة أو المعهد لإضافته';
        menu.appendChild(empty);
      }
    };

    const openMenu = () => {
      if (closeMenu) return;
      renderOptions();
      closeMenu = movePopover(menu, control, root, () => {
        closeMenu = null;
        syncExpanded(false);
      });
      syncExpanded(true);
    };

    const hideMenu = () => {
      if (closeMenu) closeMenu();
      closeMenu = null;
      activeIndex = -1;
      syncExpanded(false);
    };

    input.addEventListener('focus', openMenu);
    input.addEventListener('click', () => {
      if (!closeMenu) openMenu();
    });
    input.addEventListener('input', () => {
      updateSelectedLogo();
      if (!closeMenu) openMenu();
      else renderOptions();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!closeMenu) openMenu();
        const options = optionButtons();
        if (options.length) {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          setActive(activeIndex < 0 ? (direction > 0 ? 0 : options.length - 1) : activeIndex + direction);
        }
      } else if (event.key === 'Enter' && closeMenu && activeIndex >= 0) {
        event.preventDefault();
        optionButtons()[activeIndex]?.click();
      } else if (event.key === 'Escape') {
        hideMenu();
      }
    });
    toggle.addEventListener('pointerdown', event => event.preventDefault());
    toggle.addEventListener('click', () => {
      if (closeMenu) hideMenu();
      else {
        input.focus();
        openMenu();
      }
    });
    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (!root.contains(document.activeElement) && !menu.contains(document.activeElement)) hideMenu();
      }, 0);
    });
    document.addEventListener('pointerdown', event => {
      if (!root.contains(event.target) && !menu.contains(event.target)) hideMenu();
    });

    updateSelectedLogo();
    root.dataset.universityPickerReady = 'true';
    return {
      setValue: value => selectUniversity(value || '', false),
      setUniversities(items) {
        universities = items;
        updateSelectedLogo();
        if (closeMenu) renderOptions();
      }
    };
  }

  function initSelect(select) {
    if (select.dataset.leoSelectReady === 'true') return null;
    const parent = select.parentElement;
    if (!parent) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'leo-select';
    if (select.style.flex) wrapper.style.flex = select.style.flex;
    parent.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const id = select.id || `leoSelect_${Math.random().toString(36).slice(2, 9)}`;
    select.id = id;
    const menu = document.createElement('div');
    menu.className = 'leo-select-menu';
    menu.id = `${id}_options`;
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    const trigger = document.createElement('button');
    trigger.className = 'leo-select-trigger';
    trigger.type = 'button';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-controls', menu.id);
    trigger.setAttribute('aria-expanded', 'false');
    const current = document.createElement('span');
    current.className = 'leo-select-current';
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('width', '16');
    chevron.setAttribute('height', '16');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    chevron.setAttribute('stroke-linecap', 'round');
    chevron.setAttribute('stroke-linejoin', 'round');
    chevron.classList.add('leo-select-chevron');
    const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chevronPath.setAttribute('d', 'm7 10 5 5 5-5');
    chevron.appendChild(chevronPath);
    trigger.append(current, chevron);
    wrapper.append(trigger, menu);

    select.classList.add('leo-select-native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    select.dataset.leoSelectReady = 'true';

    let closeMenu = null;
    let activeIndex = -1;
    const syncExpanded = expanded => trigger.setAttribute('aria-expanded', String(expanded));

    const updateLabel = () => {
      const selected = select.options[select.selectedIndex];
      current.textContent = selected ? selected.textContent.trim() : 'اختر';
      trigger.disabled = select.disabled;
      if (selected) {
        menu.querySelectorAll('[role="option"]').forEach(option => {
          option.setAttribute('aria-selected', String(option.dataset.value === select.value));
        });
      }
    };

    const renderOptions = () => {
      menu.replaceChildren();
      activeIndex = -1;
      Array.from(select.options).forEach((nativeOption, index) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'leo-select-option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(nativeOption.value === select.value));
        option.dataset.value = nativeOption.value;
        option.tabIndex = -1;
        option.disabled = nativeOption.disabled;
        const label = document.createElement('span');
        label.className = 'leo-select-option-label';
        label.textContent = nativeOption.textContent.trim();
        option.appendChild(label);
        option.addEventListener('pointerdown', event => event.preventDefault());
        option.addEventListener('click', () => {
          if (nativeOption.disabled) return;
          select.value = nativeOption.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          updateLabel();
          hideMenu();
          trigger.focus();
        });
        option.addEventListener('mousemove', () => setActive(index));
        menu.appendChild(option);
      });
      updateLabel();
    };

    function setActive(index) {
      const options = Array.from(menu.querySelectorAll('[role="option"]:not(:disabled)'));
      if (!options.length) return;
      activeIndex = (index + options.length) % options.length;
      options.forEach((option, optionIndex) => option.classList.toggle('is-active', optionIndex === activeIndex));
      trigger.setAttribute('aria-activedescendant', options[activeIndex].id || `${id}_option_${activeIndex}`);
      options[activeIndex].id = `${id}_option_${activeIndex}`;
      options[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    const openMenu = () => {
      if (closeMenu || trigger.disabled) return;
      renderOptions();
      closeMenu = movePopover(menu, trigger, wrapper, () => {
        closeMenu = null;
        syncExpanded(false);
        trigger.removeAttribute('aria-activedescendant');
      });
      syncExpanded(true);
    };

    function hideMenu() {
      if (closeMenu) closeMenu();
      closeMenu = null;
      activeIndex = -1;
      syncExpanded(false);
      trigger.removeAttribute('aria-activedescendant');
    }

    trigger.addEventListener('click', () => closeMenu ? hideMenu() : openMenu());
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!closeMenu) openMenu();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const optionCount = menu.querySelectorAll('[role="option"]:not(:disabled)').length;
        if (optionCount) setActive(activeIndex < 0 ? (direction > 0 ? 0 : optionCount - 1) : activeIndex + direction);
      } else if (event.key === 'Enter' && closeMenu && activeIndex >= 0) {
        event.preventDefault();
        menu.querySelectorAll('[role="option"]:not(:disabled)')[activeIndex]?.click();
      } else if (event.key === 'Escape') {
        hideMenu();
      }
    });
    trigger.addEventListener('blur', () => window.setTimeout(() => {
      if (!wrapper.contains(document.activeElement) && !menu.contains(document.activeElement)) hideMenu();
    }, 0));
    document.addEventListener('pointerdown', event => {
      if (!wrapper.contains(event.target) && !menu.contains(event.target)) hideMenu();
    });
    select.addEventListener('change', updateLabel);
    const observer = new MutationObserver(() => renderOptions());
    observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled', 'label', 'value'] });

    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) {
      trigger.setAttribute('aria-label', label.textContent.trim());
      label.addEventListener('click', event => {
        event.preventDefault();
        trigger.focus();
        openMenu();
      });
    }

    updateLabel();
    select._leoCustomDropdown = { refresh: renderOptions };
    return select._leoCustomDropdown;
  }

  const initializeFormControls = () => {
    if (window.__leoFormControlsInitialized) return;
    window.__leoFormControlsInitialized = true;

    const universityPickers = Array.from(document.querySelectorAll('[data-university-picker]'));
    const selectStates = new WeakMap();

    universityPickers.forEach(root => {
      const picker = initUniversityPicker(root);
      if (!picker) return;
      root._leoUniversityPicker = picker;
      loadUniversities().then(universities => picker.setUniversities(universities));
    });

    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(select => selectStates.set(select, initSelect(select)));
    window.LeoDropdowns = {
      refresh(select) {
        const state = selectStates.get(select) || select?._leoCustomDropdown;
        if (state && typeof state.refresh === 'function') state.refresh();
      }
    };
    window.LeoUniversityPicker = {
      setValue(input, value) {
        const target = typeof input === 'string' ? document.getElementById(input) : input;
        const root = target?.closest('[data-university-picker]');
        if (!target || !root) return;
        const entry = root._leoUniversityPicker;
        target.value = value || '';
        if (entry) entry.setValue(target.value);
      }
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormControls, { once: true });
  } else {
    initializeFormControls();
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activePopoverClose) activePopoverClose();
  });
})();
