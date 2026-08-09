pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // SDK oficial PagBank / PagSeguro PlugPag (SmartPOS / Moderninha)
        maven { url = uri("https://github.com/pagseguro/PlugPagServiceWrapper/raw/master") }
    }
}

rootProject.name = "SistemaPDV"
include(":app")
