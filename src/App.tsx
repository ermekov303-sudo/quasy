import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { WorkoutScreen } from './screens/workout/WorkoutScreen'
import { TabLayout } from './ui/BottomNav'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<HomeScreen />} />
            <Route path="progress" element={<ProgressScreen />} />
            <Route path="records" element={<RecordsScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
          </Route>
          {/* Workout flow opens separately, without the tab bar */}
          {/* same element type on both paths → no remount: camera + model survive START */}
          <Route path="workout/setup" element={<WorkoutScreen />} />
          <Route path="workout/live" element={<WorkoutScreen />} />
          <Route path="workout/:id" element={<SummaryScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
