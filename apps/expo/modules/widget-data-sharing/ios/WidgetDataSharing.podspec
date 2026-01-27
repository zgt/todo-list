Pod::Spec.new do |s|
  s.name           = 'WidgetDataSharing'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for sharing data with iOS widgets'
  s.description    = 'An Expo module that enables React Native apps to share data with iOS widgets via App Groups'
  s.author         = ''
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
  s.swift_version = '5.4'
end
