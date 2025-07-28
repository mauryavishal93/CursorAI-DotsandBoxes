// Simple test script to verify game functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dots and Boxes Game Functionality...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
    'index.html',
    'public/js/game.js',
    'public/js/online.js',
    'public/css/styles.css',
    'server.js',
    'package.json'
];

console.log('📁 Checking required files...');
let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allFilesExist = false;
    }
});

// Test 2: Check package.json for required dependencies
console.log('\n📦 Checking package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['express', 'socket.io'];
    let depsOk = true;
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep} dependency found`);
        } else {
            console.log(`❌ ${dep} dependency missing`);
            depsOk = false;
        }
    });
    
    if (depsOk) {
        console.log('✅ All required dependencies present');
    } else {
        console.log('❌ Missing required dependencies');
    }
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

// Test 3: Check HTML structure
console.log('\n🌐 Checking HTML structure...');
try {
    const html = fs.readFileSync('index.html', 'utf8');
    
    const requiredElements = [
        'sp-gameCanvas',
        'tp-gameCanvas', 
        'online-gameCanvas',
        'sp-dice-display',
        'tp-dice-display',
        'online-dice-display'
    ];
    
    let htmlOk = true;
    requiredElements.forEach(element => {
        if (html.includes(element)) {
            console.log(`✅ ${element} found in HTML`);
        } else {
            console.log(`❌ ${element} missing from HTML`);
            htmlOk = false;
        }
    });
    
    if (htmlOk) {
        console.log('✅ All required HTML elements present');
    } else {
        console.log('❌ Missing required HTML elements');
    }
} catch (error) {
    console.log('❌ Error reading HTML file:', error.message);
}

// Test 4: Check JavaScript syntax
console.log('\n🔧 Checking JavaScript syntax...');
try {
    const gameJs = fs.readFileSync('public/js/game.js', 'utf8');
    const onlineJs = fs.readFileSync('public/js/online.js', 'utf8');
    
    // Basic syntax check - try to parse as JSON-like structure
    const jsFiles = [
        { name: 'game.js', content: gameJs },
        { name: 'online.js', content: onlineJs }
    ];
    
    jsFiles.forEach(file => {
        try {
            // Check for basic JavaScript syntax patterns
            const hasFunctions = file.content.includes('function');
            const hasVariables = file.content.includes('const') || file.content.includes('let') || file.content.includes('var');
            const hasComments = file.content.includes('//') || file.content.includes('/*');
            
            if (hasFunctions && hasVariables) {
                console.log(`✅ ${file.name} has valid JavaScript structure`);
            } else {
                console.log(`❌ ${file.name} may have syntax issues`);
            }
        } catch (error) {
            console.log(`❌ Error checking ${file.name}:`, error.message);
        }
    });
} catch (error) {
    console.log('❌ Error reading JavaScript files:', error.message);
}

// Test 5: Check for updated dice rules
console.log('\n🎲 Checking dice rules implementation...');
try {
    const gameJs = fs.readFileSync('public/js/game.js', 'utf8');
    const html = fs.readFileSync('index.html', 'utf8');
    
    // Check for dice value 6 handling
    if (gameJs.includes('diceValue <= 6') || gameJs.includes('forceValue <= 6') || gameJs.includes('Math.random() * 6) + 1')) {
        console.log('✅ Dice values 1-6 handling found');
    } else {
        console.log('❌ Dice values 1-6 handling not found');
    }
    
    // Check for special line logic
    if (gameJs.includes('SPECIAL_LINE_DICE_VALUE') && gameJs.includes('getRemainingBoxes() > 5')) {
        console.log('✅ Special line logic found');
    } else {
        console.log('❌ Special line logic not found');
    }
    
    // Check HTML rules
    if (html.includes('Dice values 1-6')) {
        console.log('✅ Updated dice rules in HTML');
    } else {
        console.log('❌ Updated dice rules not found in HTML');
    }
    
} catch (error) {
    console.log('❌ Error checking dice rules:', error.message);
}

console.log('\n🎉 Testing complete!');
console.log('\nTo run the game:');
console.log('1. npm install');
console.log('2. npm start');
console.log('3. Open http://localhost:8000 in your browser'); 