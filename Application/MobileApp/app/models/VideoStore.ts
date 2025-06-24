import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

/**
 * A purely volatile store: `videoActive` lives only in memory,
 * never appears in snapshots or gets persisted.
 */
export const VideoStoreModel = types
  .model("VideoStore", {
    // no props here
  })
  .volatile(() => ({
    /** not part of props/snapshots */
    videoActive: false as boolean,
  }))
  .actions(withSetPropAction)
  .actions((self) => ({
    /** Toggle the boolean flag */
    toggleVideoActive() {
      self.videoActive = !self.videoActive
    },
    /** You can still set it directly if needed */
    setVideoActive(value: boolean) {
      self.videoActive = value
    },
  }))

export interface VideoStore extends Instance<typeof VideoStoreModel> {}
export interface VideoStoreSnapshot extends SnapshotOut<typeof VideoStoreModel> {}

// helper to create a new in-memory store
export const createVideoStore = () => VideoStoreModel.create({})
