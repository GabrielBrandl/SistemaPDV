import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.pdvcashless"
    // compileSdk 34 exigido pelas deps AndroidX; targetSdk do flavor cielo = 29
    // (pré-requisito Cielo Smart). Docs: https://docs.cielo.com.br/cielo-smart/docs/pre-requisitos
    compileSdk = 34

    defaultConfig {
        applicationId = "com.pdvcashless"
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "1.0.2"
        // Produção EasyPanel (maquininha). Emulador local: http://10.0.2.2:3001/api/v1
        buildConfigField("String", "API_BASE_URL", "\"https://sistema-pdv.129-121-39-17.sslip.io/api/v1\"")
        buildConfigField("String", "PAGBANK_ACTIVATION_CODE", "\"\"")
        buildConfigField("String", "CIELO_CLIENT_ID", "\"\"")
        buildConfigField("String", "CIELO_ACCESS_TOKEN", "\"\"")
        buildConfigField("boolean", "HAS_CIELO", "false")
        buildConfigField("boolean", "HAS_MERCADOPAGO", "false")
        buildConfigField("String", "PAYMENT_PROVIDER", "\"demo\"")
    }

    flavorDimensions += "store"
    productFlavors {
        create("demo") {
            dimension = "store"
            applicationIdSuffix = ".demo"
            versionNameSuffix = "-demo"
            buildConfigField("boolean", "DEMO_PAYMENT", "true")
            buildConfigField("boolean", "HAS_PLUGPAG", "false")
            buildConfigField("boolean", "HAS_CIELO", "false")
            buildConfigField("boolean", "HAS_MERCADOPAGO", "false")
            buildConfigField("String", "PAYMENT_PROVIDER", "\"demo\"")
        }
        create("pagbank") {
            dimension = "store"
            buildConfigField("boolean", "DEMO_PAYMENT", "false")
            buildConfigField("boolean", "HAS_PLUGPAG", "true")
            buildConfigField("boolean", "HAS_CIELO", "false")
            buildConfigField("boolean", "HAS_MERCADOPAGO", "false")
            buildConfigField("String", "PAYMENT_PROVIDER", "\"pagbank\"")
        }
        create("cielo") {
            dimension = "store"
            // Novo package: br.com.pyrou.pdvcashless.cielo já existe na Cielo Store
            // (certificado antigo perdido → não dá para atualizar aquele app).
            applicationId = "br.com.pyrou.sistemapdv.cielo"
            // Pré-requisito Cielo Smart: min 24 / target 29
            // https://docs.cielo.com.br/cielo-smart/docs/pre-requisitos
            minSdk = 24
            targetSdk = 29
            // Sem "-cielo" no versionName — loja reprova identificação com o nome Cielo
            versionNameSuffix = ""
            buildConfigField("boolean", "DEMO_PAYMENT", "false")
            buildConfigField("boolean", "HAS_PLUGPAG", "false")
            buildConfigField("boolean", "HAS_CIELO", "true")
            buildConfigField("boolean", "HAS_MERCADOPAGO", "false")
            buildConfigField("String", "PAYMENT_PROVIDER", "\"cielo\"")
            val propsFile = rootProject.file("keystore.properties")
            val props = Properties()
            if (propsFile.exists()) {
                propsFile.inputStream().use { props.load(it) }
            }
            val cieloId = System.getenv("CIELO_CLIENT_ID")
                ?: props.getProperty("CIELO_CLIENT_ID")
                ?: ""
            val cieloTok = System.getenv("CIELO_ACCESS_TOKEN")
                ?: props.getProperty("CIELO_ACCESS_TOKEN")
                ?: ""
            buildConfigField("String", "CIELO_CLIENT_ID", "\"$cieloId\"")
            buildConfigField("String", "CIELO_ACCESS_TOKEN", "\"$cieloTok\"")
        }
        create("mercadopago") {
            dimension = "store"
            applicationIdSuffix = ".mp"
            versionNameSuffix = "-mp"
            buildConfigField("boolean", "DEMO_PAYMENT", "false")
            buildConfigField("boolean", "HAS_PLUGPAG", "false")
            buildConfigField("boolean", "HAS_CIELO", "false")
            buildConfigField("boolean", "HAS_MERCADOPAGO", "true")
            buildConfigField("String", "PAYMENT_PROVIDER", "\"mercadopago\"")
        }
    }

    signingConfigs {
        create("release") {
            val propsFile = rootProject.file("keystore.properties")
            val props = Properties()
            if (propsFile.exists()) {
                propsFile.inputStream().use { props.load(it) }
            }
            val ksPath = props.getProperty("storeFile") ?: "app/pdv-cielo.jks"
            val ksFile = rootProject.file(ksPath)
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword =
                    System.getenv("PDV_KEYSTORE_PASSWORD")
                        ?: props.getProperty("storePassword")
                keyAlias =
                    System.getenv("PDV_KEY_ALIAS")
                        ?: props.getProperty("keyAlias")
                        ?: "pdvcashless"
                keyPassword =
                    System.getenv("PDV_KEY_PASSWORD")
                        ?: props.getProperty("keyPassword")
                // Cielo Store: v1 (keytool) + v2 (apk-signer) — "Certificado não localizado"
                // ocorre quando só um dos schemes está presente.
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = false
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug { }
    }

    lint {
        checkReleaseBuilds = true
        abortOnError = true
        disable += "ExpiredTargetSdkVersion"
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
        getByName("cielo") {
            java.srcDir("src/cielo/java")
        }
        getByName("mercadopago") {
            java.srcDir("src/mercadopago/java")
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
