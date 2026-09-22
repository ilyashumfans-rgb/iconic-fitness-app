Pod::Spec.new do |s|
  s.name = 'IconicHealth'
  s.version = '1.0.0'
  s.summary = 'Read-only local HealthKit bridge for Iconic Fitness'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Iconic Fitness'
  s.homepage = 'https://iconicfitness.in'
  s.source = { :git => 'https://github.com/expo/expo.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end