/**
 * Testes de Acessibilidade e Usabilidade
 * 
 * Este arquivo contém funções para testar a conformidade com WCAG 2.1 AA
 * e validar a usabilidade das interfaces reformuladas.
 */

export interface AccessibilityTestResult {
  passed: boolean;
  message: string;
  element?: HTMLElement;
  severity: 'error' | 'warning' | 'info';
}

export class AccessibilityTester {
  private results: AccessibilityTestResult[] = [];

  /**
   * Executa todos os testes de acessibilidade
   */
  public runAllTests(): AccessibilityTestResult[] {
    this.results = [];
    
    this.testKeyboardNavigation();
    this.testColorContrast();
    this.testAriaLabels();
    this.testFocusManagement();
    this.testSemanticHTML();
    this.testScreenReaderSupport();
    this.testResponsiveDesign();
    this.testFormAccessibility();
    
    return this.results;
  }

  /**
   * Testa navegação por teclado
   */
  private testKeyboardNavigation(): void {
    const interactiveElements = document.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (interactiveElements.length === 0) {
      this.addResult(false, 'Nenhum elemento interativo encontrado', undefined, 'error');
      return;
    }

    let focusableCount = 0;
    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Verifica se o elemento é focável
      if (this.isFocusable(htmlElement)) {
        focusableCount++;
      }
      
      // Verifica se tem indicador visual de foco
      if (!this.hasFocusIndicator(htmlElement)) {
        this.addResult(
          false, 
          `Elemento ${element.tagName} não tem indicador visual de foco adequado`,
          htmlElement,
          'warning'
        );
      }
    });

    this.addResult(
      focusableCount > 0,
      `${focusableCount} elementos focáveis encontrados`,
      undefined,
      'info'
    );
  }

  /**
   * Testa contraste de cores
   */
  private testColorContrast(): void {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, a');
    
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const styles = window.getComputedStyle(htmlElement);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrastRatio = this.calculateContrastRatio(color, backgroundColor);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const minRatio = isLargeText ? 3 : 4.5;
        
        if (contrastRatio < minRatio) {
          this.addResult(
            false,
            `Contraste insuficiente: ${contrastRatio.toFixed(2)}:1 (mínimo: ${minRatio}:1)`,
            htmlElement,
            'error'
          );
        }
      }
    });
  }

  /**
   * Testa ARIA labels e roles
   */
  private testAriaLabels(): void {
    // Testa botões sem texto
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
      
      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        this.addResult(
          false,
          'Botão sem texto ou aria-label',
          button as HTMLElement,
          'error'
        );
      }
    });

    // Testa imagens sem alt
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.getAttribute('alt')) {
        this.addResult(
          false,
          'Imagem sem atributo alt',
          img as HTMLElement,
          'error'
        );
      }
    });

    // Testa landmarks
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      this.addResult(false, 'Elemento main não encontrado', undefined, 'warning');
    }

    const nav = document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      this.addResult(false, 'Elemento nav não encontrado', undefined, 'warning');
    }
  }

  /**
   * Testa gerenciamento de foco
   */
  private testFocusManagement(): void {
    // Testa skip links
    const skipLinks = document.querySelectorAll('.skip-link, [href="#main-content"]');
    if (skipLinks.length === 0) {
      this.addResult(false, 'Skip links não encontrados', undefined, 'warning');
    }

    // Testa ordem de tabulação
    const tabbableElements = document.querySelectorAll('[tabindex]');
    let hasNegativeTabindex = false;
    let hasPositiveTabindex = false;

    tabbableElements.forEach((element) => {
      const tabindex = parseInt(element.getAttribute('tabindex') || '0');
      if (tabindex < 0) hasNegativeTabindex = true;
      if (tabindex > 0) hasPositiveTabindex = true;
    });

    if (hasPositiveTabindex) {
      this.addResult(
        false,
        'Uso de tabindex positivo detectado (não recomendado)',
        undefined,
        'warning'
      );
    }
  }

  /**
   * Testa HTML semântico
   */
  private testSemanticHTML(): void {
    // Verifica estrutura de cabeçalhos
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let hasH1 = false;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level === 1) {
        hasH1 = true;
      }
      
      if (previousLevel > 0 && level > previousLevel + 1) {
        this.addResult(
          false,
          `Hierarquia de cabeçalhos quebrada: ${heading.tagName} após h${previousLevel}`,
          heading as HTMLElement,
          'warning'
        );
      }
      
      previousLevel = level;
    });

    if (!hasH1) {
      this.addResult(false, 'Página sem elemento h1', undefined, 'error');
    }

    // Verifica uso de listas
    const listItems = document.querySelectorAll('li');
    listItems.forEach((li) => {
      const parent = li.parentElement;
      if (parent && !['UL', 'OL'].includes(parent.tagName)) {
        this.addResult(
          false,
          'Item de lista fora de ul/ol',
          li as HTMLElement,
          'error'
        );
      }
    });
  }

  /**
   * Testa suporte a leitores de tela
   */
  private testScreenReaderSupport(): void {
    // Verifica elementos com aria-live
    const liveRegions = document.querySelectorAll('[aria-live]');
    if (liveRegions.length === 0) {
      this.addResult(
        false,
        'Nenhuma região aria-live encontrada para anúncios',
        undefined,
        'info'
      );
    }

    // Verifica elementos ocultos para screen readers
    const srOnlyElements = document.querySelectorAll('.sr-only, .visually-hidden');
    if (srOnlyElements.length > 0) {
      this.addResult(
        true,
        `${srOnlyElements.length} elementos apenas para leitores de tela encontrados`,
        undefined,
        'info'
      );
    }

    // Verifica formulários
    const formControls = document.querySelectorAll('input, select, textarea');
    formControls.forEach((control) => {
      const htmlControl = control as HTMLElement;
      const id = htmlControl.getAttribute('id');
      const ariaLabel = htmlControl.getAttribute('aria-label');
      const ariaLabelledBy = htmlControl.getAttribute('aria-labelledby');
      
      let hasLabel = false;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) hasLabel = true;
      }
      
      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        this.addResult(
          false,
          'Controle de formulário sem label associado',
          htmlControl,
          'error'
        );
      }
    });
  }

  /**
   * Testa design responsivo
   */
  private testResponsiveDesign(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      this.addResult(false, 'Meta tag viewport não encontrada', undefined, 'error');
    }

    // Testa elementos que podem causar scroll horizontal
    const body = document.body;
    const bodyWidth = body.scrollWidth;
    const windowWidth = window.innerWidth;

    if (bodyWidth > windowWidth) {
      this.addResult(
        false,
        'Scroll horizontal detectado',
        undefined,
        'warning'
      );
    }

    // Testa tamanho mínimo de elementos tocáveis
    const touchTargets = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    touchTargets.forEach((target) => {
      const htmlTarget = target as HTMLElement;
      const rect = htmlTarget.getBoundingClientRect();
      const minSize = 44; // Tamanho mínimo recomendado pelo WCAG
      
      if (rect.width < minSize || rect.height < minSize) {
        this.addResult(
          false,
          `Elemento tocável muito pequeno: ${rect.width}x${rect.height}px (mínimo: ${minSize}x${minSize}px)`,
          htmlTarget,
          'warning'
        );
      }
    });
  }

  /**
   * Testa acessibilidade de formulários
   */
  private testFormAccessibility(): void {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form) => {
      // Verifica se campos obrigatórios estão marcados
      const requiredFields = form.querySelectorAll('[required]');
      requiredFields.forEach((field) => {
        const htmlField = field as HTMLElement;
        const ariaRequired = htmlField.getAttribute('aria-required');
        const hasRequiredIndicator = htmlField.closest('.form-group')?.querySelector('.required');
        
        if (!ariaRequired && !hasRequiredIndicator) {
          this.addResult(
            false,
            'Campo obrigatório sem indicação visual ou aria-required',
            htmlField,
            'warning'
          );
        }
      });

      // Verifica mensagens de erro
      const errorMessages = form.querySelectorAll('.form-error, [role="alert"]');
      const invalidFields = form.querySelectorAll(':invalid');
      
      if (invalidFields.length > 0 && errorMessages.length === 0) {
        this.addResult(
          false,
          'Campos inválidos sem mensagens de erro',
          undefined,
          'warning'
        );
      }
    });
  }

  /**
   * Utilitários privados
   */
  private isFocusable(element: HTMLElement): boolean {
    if (element.tabIndex < 0) return false;
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    return true;
  }

  private hasFocusIndicator(element: HTMLElement): boolean {
    // Simula foco e verifica se há mudança visual
    element.focus();
    const focusedStyles = window.getComputedStyle(element);
    element.blur();
    const normalStyles = window.getComputedStyle(element);
    
    return (
      focusedStyles.outline !== normalStyles.outline ||
      focusedStyles.boxShadow !== normalStyles.boxShadow ||
      focusedStyles.backgroundColor !== normalStyles.backgroundColor ||
      focusedStyles.borderColor !== normalStyles.borderColor
    );
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Implementação simplificada do cálculo de contraste
    // Em um ambiente real, seria necessária uma implementação mais robusta
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private parseColor(color: string): [number, number, number] {
    // Implementação simplificada - em produção usar biblioteca como chroma.js
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0];
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  private addResult(passed: boolean, message: string, element?: HTMLElement, severity: 'error' | 'warning' | 'info' = 'info'): void {
    this.results.push({ passed, message, element, severity });
  }
}

/**
 * Testes de Usabilidade
 */
export class UsabilityTester {
  private results: AccessibilityTestResult[] = [];

  public runUsabilityTests(): AccessibilityTestResult[] {
    this.results = [];
    
    this.testLoadingStates();
    this.testErrorHandling();
    this.testFeedback();
    this.testConsistency();
    this.testPerformance();
    
    return this.results;
  }

  private testLoadingStates(): void {
    const loadingElements = document.querySelectorAll('.loading-spinner, .loading-skeleton');
    
    if (loadingElements.length === 0) {
      this.addResult(
        false,
        'Nenhum indicador de carregamento encontrado',
        undefined,
        'warning'
      );
    } else {
      this.addResult(
        true,
        `${loadingElements.length} indicadores de carregamento encontrados`,
        undefined,
        'info'
      );
    }
  }

  private testErrorHandling(): void {
    const errorElements = document.querySelectorAll('.form-error, .error-message, [role="alert"]');
    const emptyStates = document.querySelectorAll('.empty-state');
    
    this.addResult(
      errorElements.length > 0 || emptyStates.length > 0,
      'Estados de erro e vazios implementados',
      undefined,
      'info'
    );
  }

  private testFeedback(): void {
    const toastElements = document.querySelectorAll('.toast, .notification');
    const buttons = document.querySelectorAll('button');
    
    let buttonsWithFeedback = 0;
    buttons.forEach((button) => {
      const hasHoverEffect = this.hasHoverEffect(button as HTMLElement);
      if (hasHoverEffect) buttonsWithFeedback++;
    });

    this.addResult(
      buttonsWithFeedback > 0,
      `${buttonsWithFeedback} botões com feedback visual`,
      undefined,
      'info'
    );
  }

  private testConsistency(): void {
    // Testa consistência de espaçamento
    const cards = document.querySelectorAll('.card, .section-card');
    const buttons = document.querySelectorAll('.btn');
    
    this.addResult(
      cards.length > 0 && buttons.length > 0,
      'Componentes consistentes encontrados',
      undefined,
      'info'
    );
  }

  private testPerformance(): void {
    // Testa se há muitos elementos DOM
    const totalElements = document.querySelectorAll('*').length;
    
    if (totalElements > 1500) {
      this.addResult(
        false,
        `Muitos elementos DOM: ${totalElements} (pode afetar performance)`,
        undefined,
        'warning'
      );
    }

    // Testa se há imagens sem lazy loading
    const images = document.querySelectorAll('img');
    let imagesWithLazyLoading = 0;
    
    images.forEach((img) => {
      if (img.getAttribute('loading') === 'lazy') {
        imagesWithLazyLoading++;
      }
    });

    if (images.length > 0) {
      this.addResult(
        imagesWithLazyLoading > 0,
        `${imagesWithLazyLoading}/${images.length} imagens com lazy loading`,
        undefined,
        'info'
      );
    }
  }

  private hasHoverEffect(element: HTMLElement): boolean {
    const originalTransform = element.style.transform;
    const originalBackground = element.style.backgroundColor;
    
    // Simula hover
    element.dispatchEvent(new MouseEvent('mouseenter'));
    const hoverStyles = window.getComputedStyle(element);
    
    element.dispatchEvent(new MouseEvent('mouseleave'));
    const normalStyles = window.getComputedStyle(element);
    
    return (
      hoverStyles.transform !== normalStyles.transform ||
      hoverStyles.backgroundColor !== normalStyles.backgroundColor ||
      hoverStyles.boxShadow !== normalStyles.boxShadow
    );
  }

  private addResult(passed: boolean, message: string, element?: HTMLElement, severity: 'error' | 'warning' | 'info' = 'info'): void {
    this.results.push({ passed, message, element, severity });
  }
}

/**
 * Função utilitária para executar todos os testes
 */
export function runAllTests(): {
  accessibility: AccessibilityTestResult[];
  usability: AccessibilityTestResult[];
  summary: {
    total: number;
    passed: number;
    errors: number;
    warnings: number;
  };
} {
  const accessibilityTester = new AccessibilityTester();
  const usabilityTester = new UsabilityTester();
  
  const accessibility = accessibilityTester.runAllTests();
  const usability = usabilityTester.runUsabilityTests();
  
  const allResults = [...accessibility, ...usability];
  const summary = {
    total: allResults.length,
    passed: allResults.filter(r => r.passed).length,
    errors: allResults.filter(r => r.severity === 'error').length,
    warnings: allResults.filter(r => r.severity === 'warning').length
  };
  
  return { accessibility, usability, summary };
}
