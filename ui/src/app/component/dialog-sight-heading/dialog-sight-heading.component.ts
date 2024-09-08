import { Component, HostListener, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { VideoSize } from '../sight-heading/sight-heading.component';

@Component({
  selector: 'app-dialog-sight-heading',
  templateUrl: './dialog-sight-heading.component.html',
  styleUrl: './dialog-sight-heading.component.scss'
})
export class DialogSightHeadingComponent {


  width = 300;
  height = 300;

  private aspectRatio = 1;

  constructor(public dialogRef: MatDialogRef<DialogSightHeadingComponent, number>) { }


  closeDialog() {
    this.dialogRef.close(undefined);
  }


  headingSelected(offset: number): void {
    this.dialogRef.close(offset);
  }


  videoSizeChange(size: VideoSize): void {
    if (size)
      this.aspectRatio = size.width / size.height;
    else
      this.aspectRatio = 1;

    this.resizeWindow();
  }


  @HostListener('window:resize')
  private resizeWindow(): void {
    const maxWidth = window.innerWidth * 0.9; // 90dvw
    const maxHeight = window.innerHeight * 0.9; // 90dvh

    let newWidth = maxWidth;
    let newHeight = maxWidth / this.aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * this.aspectRatio;
    }

    this.width = newWidth;
    this.height = newHeight;

    this.dialogRef.updateSize(`${this.width.toFixed(0)}px`, `${this.height.toFixed(0)}px`);
  }

}



@Injectable({
  providedIn: 'root'
})
export class DialogSightHeadingLauncher {

  constructor(
    private dialog: MatDialog,
  ) { }


  async launch(): Promise<number> {
    return await firstValueFrom(this.dialog.open<any, any, number>(DialogSightHeadingComponent, { maxHeight: "90dvh", maxWidth: "90dvw" })
      .afterClosed())
  }

}
