plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.pdvcashless"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.pdvcashless"
        minSdk = 24
        targetSdk = 30
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3001/api/v1\"")
        buildConfigField("String", "PAGBANK_ACTIVATION_CODE", "\"\"")
    }

    flavorDimensions += "store"
    productFlavors {
        create("demo") {
            dimension = "store"
            applicationIdSuffix = ".demo"
            versionNameSuffix = "-demo"
            buildConfigField("boolean", "DEMO_PAYMENT", "true")
            buildConfigField("boolean", "HAS_PLUGPAG", "false")
        }
        create("pagbank") {
            dimension = "store"
            buildConfigField("boolean", "DEMO_PAYMENT", "false")
            buildConfigField("boolean", "HAS_PLUGPAG", "true")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug { }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
    sourceSets {
        getByName("pagbank") {
            java.srcDir("src/pagbank/java")
        }
        getByName("demo") {
            java.srcDir("src/demo/java")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.google.code.gson:gson:2.10.1")

    // Só no flavor pagbank (terminal Moderninha / SmartPOS)
    "pagbankImplementation"("br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.35.0")
}
