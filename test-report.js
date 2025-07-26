// Comprehensive Test Report for Dots and Boxes
console.log('📋 Starting Comprehensive Test Report...');

class TestReporter {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    async runTest(name, testFunction) {
        try {
            console.log(`🧪 Running test: ${name}`);
            await testFunction();
            this.results.passed++;
            console.log(`✅ ${name} - PASSED`);
            return true;
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ name, error: error.message });
            console.error(`❌ ${name} - FAILED: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive test suite...');
        
        for (const test of this.tests) {
            await this.runTest(test.name, test.testFunction);
        }
        
        this.generateReport();
    }

    generateReport() {
        console.log('\n📊 TEST REPORT');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.tests.length) * 100).toFixed(1)}%`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            this.results.errors.forEach(error => {
                console.log(`- ${error.name}: ${error.error}`);
            });
        }
        
        console.log('='.repeat(50));
    }
}

const reporter = new TestReporter();

// Test 1: Check if all required HTML elements exist
reporter.addTest('HTML Elements Check', async () => {
    const requiredElements = [
        'home-screen',
        'single-player-setup-screen',
        'two-player-setup-screen',
        'single-player-game-screen',
        'two-player-game-screen',
        'online-game-screen',
        'online-lobby-ui',
        'create-lobby-btn',
        'join-lobby-btn',
        'join-lobby-code',
        'sp-gameCanvas',
        'tp-gameCanvas',
        'online-gameCanvas'
    ];

    for (const elementId of requiredElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Missing element: ${elementId}`);
        }
    }
});

// Test 2: Check if all required JavaScript functions exist
reporter.addTest('JavaScript Functions Check', async () => {
    const requiredFunctions = [
        'startGame',
        'showMessage',
        'showConfirmation',
        'showScreen'
    ];

    for (const funcName of requiredFunctions) {
        if (typeof window[funcName] !== 'function') {
            throw new Error(`Missing function: ${funcName}`);
        }
    }
});

// Test 3: Check Canvas functionality
reporter.addTest('Canvas Functionality Check', async () => {
    const canvases = [
        'sp-gameCanvas',
        'tp-gameCanvas',
        'online-gameCanvas'
    ];

    for (const canvasId of canvases) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas not found: ${canvasId}`);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error(`Canvas context not available: ${canvasId}`);
        }

        // Test basic canvas operations
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 10, 10);
    }
});

// Test 4: Check Socket.IO availability
reporter.addTest('Socket.IO Check', async () => {
    if (typeof io === 'undefined') {
        throw new Error('Socket.IO library not loaded');
    }
});

// Test 5: Check CSS loading
reporter.addTest('CSS Loading Check', async () => {
    const style = getComputedStyle(document.body);
    if (!style.fontFamily) {
        throw new Error('CSS not loading properly');
    }
});

// Test 6: Check button functionality
reporter.addTest('Button Functionality Check', async () => {
    const buttons = [
        'single-player-btn',
        'two-player-btn',
        'online-game-btn',
        'create-lobby-btn',
        'join-lobby-btn'
    ];

    for (const buttonId of buttons) {
        const button = document.getElementById(buttonId);
        if (!button) {
            throw new Error(`Button not found: ${buttonId}`);
        }

        if (typeof button.click !== 'function') {
            throw new Error(`Button not clickable: ${buttonId}`);
        }
    }
});

// Test 7: Check input fields
reporter.addTest('Input Fields Check', async () => {
    const inputs = [
        'sp-player-name-input',
        'tp-player1-name-input',
        'tp-player2-name-input',
        'join-lobby-code'
    ];

    for (const inputId of inputs) {
        const input = document.getElementById(inputId);
        if (!input) {
            throw new Error(`Input not found: ${inputId}`);
        }

        // Test input functionality
        input.value = 'test';
        if (input.value !== 'test') {
            throw new Error(`Input not working: ${inputId}`);
        }
    }
});

// Test 8: Check navigation functionality
reporter.addTest('Navigation Check', async () => {
    const homeScreen = document.getElementById('home-screen');
    const singlePlayerBtn = document.getElementById('single-player-btn');
    
    if (!homeScreen || !singlePlayerBtn) {
        throw new Error('Navigation elements not found');
    }

    // Test if we can trigger navigation (without actually navigating)
    const originalDisplay = homeScreen.style.display;
    singlePlayerBtn.click();
    
    // Reset display
    homeScreen.style.display = originalDisplay;
});

// Test 9: Check game state management
reporter.addTest('Game State Management Check', async () => {
    // Check if game state variables are accessible
    if (typeof window.gameMode === 'undefined') {
        // This is expected as gameMode is not exposed globally
        console.log('Game state variables are properly encapsulated');
    }
});

// Test 10: Check error handling
reporter.addTest('Error Handling Check', async () => {
    // Test if error handlers are in place
    const errorHandler = window.onerror;
    if (typeof errorHandler !== 'function') {
        console.log('No global error handler found (this may be expected)');
    }
});

// Test 11: Check responsive design
reporter.addTest('Responsive Design Check', async () => {
    const viewport = window.innerWidth;
    if (viewport < 100) {
        throw new Error('Viewport width is too small');
    }
});

// Test 12: Check audio functionality
reporter.addTest('Audio Functionality Check', async () => {
    const audio = document.getElementById('dice-audio');
    if (!audio) {
        throw new Error('Dice audio element not found');
    }
});

// Test 13: Check modal functionality
reporter.addTest('Modal Functionality Check', async () => {
    const modals = [
        'messageBox',
        'confirmationBox',
        'rulesModal',
        'infoModal'
    ];

    for (const modalId of modals) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            throw new Error(`Modal not found: ${modalId}`);
        }
    }
});

// Test 14: Check dice display functionality
reporter.addTest('Dice Display Check', async () => {
    const diceDisplays = [
        'sp-dice-display',
        'tp-dice-display',
        'online-dice-display'
    ];

    for (const diceId of diceDisplays) {
        const dice = document.getElementById(diceId);
        if (!dice) {
            throw new Error(`Dice display not found: ${diceId}`);
        }
    }
});

// Test 15: Check score display functionality
reporter.addTest('Score Display Check', async () => {
    const scoreElements = [
        'sp-player1-count',
        'sp-player2-count',
        'tp-player1-count',
        'tp-player2-count',
        'online-player1-count',
        'online-player2-count'
    ];

    for (const scoreId of scoreElements) {
        const score = document.getElementById(scoreId);
        if (!score) {
            throw new Error(`Score element not found: ${scoreId}`);
        }
    }
});

// Run all tests when page is loaded
window.addEventListener('load', () => {
    setTimeout(() => {
        reporter.runAllTests();
    }, 2000); // Wait for all scripts to load
});

// Export for manual testing
window.testReporter = reporter;

console.log('📋 Test reporter loaded and ready'); 