import cv2
import numpy as np
import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import json
import os
from PIL import Image, ImageTk
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.patches as patches
import matplotlib.colors as mcolors

class PointMaskAnnotationGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Point-Mask Annotation Tool")
        self.root.geometry("1200x800")
        
        # Create main frames
        self.control_frame = ttk.Frame(root, padding=10)
        self.control_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        self.canvas_frame = ttk.Frame(root)
        self.canvas_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Initialize variables
        self.image_path = None
        self.original_image = None
        self.display_image = None
        self.current_shape = []
        self.all_shapes = []
        self.current_label = "rectangle"
        self.mask = None
        self.drawing = False
        self.point_density = 0.01
        self.min_points = 10
        self.max_points = 100
        self.point_mode = "add"  # 'add', 'move', 'delete'
        self.selected_shape_idx = -1
        self.selected_point_idx = -1
        self.dragging = False
        self.drawing_preview = None
        
        # Define class colors
        self.class_colors = {
            "rectangle": (255, 0, 0),      # Red in BGR
            "triangle": (0, 255, 0),       # Green in BGR
            "circle": (0, 0, 255),         # Blue in BGR
            "polygon": (255, 255, 0),      # Yellow in BGR
            "ellipse": (255, 0, 255),      # Magenta in BGR
            "line": (0, 255, 255),         # Cyan in BGR
            "default": (128, 128, 128)     # Gray in BGR
        }
        
        # Set up the GUI components
        self._setup_control_panel()
        self._setup_canvas()
        
        # Status bar
        self.status_var = tk.StringVar()
        self.status_var.set("Ready")
        self.status_bar = ttk.Label(root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Bind keyboard shortcuts
        self.root.bind("<Control-o>", lambda e: self.load_image())
        self.root.bind("<Control-s>", lambda e: self.save_annotations())
        self.root.bind("<Escape>", lambda e: self.cancel_current_shape())
        
    def _setup_control_panel(self):
        """Set up the control panel with buttons and options."""
        # File operations
        file_frame = ttk.LabelFrame(self.control_frame, text="File Operations", padding=5)
        file_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(file_frame, text="Load Image", command=self.load_image).pack(fill=tk.X, pady=2)
        ttk.Button(file_frame, text="Load Annotations", command=self.load_annotations).pack(fill=tk.X, pady=2)
        ttk.Button(file_frame, text="Save Annotations", command=self.save_annotations).pack(fill=tk.X, pady=2)
        ttk.Button(file_frame, text="Export Mask", command=self.export_mask).pack(fill=tk.X, pady=2)
        
        # Shape selection
        shape_frame = ttk.LabelFrame(self.control_frame, text="Shape Type", padding=5)
        shape_frame.pack(fill=tk.X, pady=5)
        
        self.shape_var = tk.StringVar(value="rectangle")
        shapes = ["rectangle", "triangle", "circle", "polygon", "ellipse", "line"]
        
        for shape in shapes:
            ttk.Radiobutton(shape_frame, text=shape.capitalize(), value=shape, 
                           variable=self.shape_var, command=self.update_shape_type).pack(anchor=tk.W)
        
        # Point mode selection
        point_frame = ttk.LabelFrame(self.control_frame, text="Point Mode", padding=5)
        point_frame.pack(fill=tk.X, pady=5)
        
        self.point_mode_var = tk.StringVar(value="add")
        ttk.Radiobutton(point_frame, text="Add Points", value="add", 
                       variable=self.point_mode_var, command=self.update_point_mode).pack(anchor=tk.W)
        ttk.Radiobutton(point_frame, text="Move Points", value="move", 
                       variable=self.point_mode_var, command=self.update_point_mode).pack(anchor=tk.W)
        ttk.Radiobutton(point_frame, text="Delete Points", value="delete", 
                       variable=self.point_mode_var, command=self.update_point_mode).pack(anchor=tk.W)
        
        # Controls
        controls_frame = ttk.LabelFrame(self.control_frame, text="Controls", padding=5)
        controls_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(controls_frame, text="Complete Shape", command=self.complete_shape).pack(fill=tk.X, pady=2)
        ttk.Button(controls_frame, text="Cancel Shape", command=self.cancel_current_shape).pack(fill=tk.X, pady=2)
        ttk.Button(controls_frame, text="Clear All", command=self.clear_all).pack(fill=tk.X, pady=2)
        
        # Conversion options
        conv_frame = ttk.LabelFrame(self.control_frame, text="Conversion Options", padding=5)
        conv_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(conv_frame, text="Point Density:").pack(anchor=tk.W)
        self.density_var = tk.DoubleVar(value=0.01)
        density_scale = ttk.Scale(conv_frame, from_=0.001, to=0.05, 
                                 variable=self.density_var, orient=tk.HORIZONTAL)
        density_scale.pack(fill=tk.X)
        
        ttk.Label(conv_frame, text="Min Points:").pack(anchor=tk.W)
        self.min_points_var = tk.IntVar(value=10)
        min_scale = ttk.Scale(conv_frame, from_=3, to=50, 
                             variable=self.min_points_var, orient=tk.HORIZONTAL)
        min_scale.pack(fill=tk.X)
        
        ttk.Label(conv_frame, text="Max Points:").pack(anchor=tk.W)
        self.max_points_var = tk.IntVar(value=100)
        max_scale = ttk.Scale(conv_frame, from_=20, to=500, 
                             variable=self.max_points_var, orient=tk.HORIZONTAL)
        max_scale.pack(fill=tk.X)
        
        # Conversion buttons
        ttk.Button(conv_frame, text="Points → Mask", command=self.convert_points_to_mask).pack(fill=tk.X, pady=2)
        ttk.Button(conv_frame, text="Mask → Points", command=self.convert_mask_to_points).pack(fill=tk.X, pady=2)
        
    def _setup_canvas(self):
        """Set up the canvas for drawing."""
        # Create a figure and axis for matplotlib
        self.fig = plt.Figure(figsize=(8, 6), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.ax.set_title("Annotation Canvas")
        self.ax.set_xticks([])
        self.ax.set_yticks([])
        
        # Embed matplotlib figure in Tkinter
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.canvas_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Bind mouse events
        self.canvas.mpl_connect('button_press_event', self.on_canvas_click)
        self.canvas.mpl_connect('motion_notify_event', self.on_canvas_move)
        self.canvas.mpl_connect('button_release_event', self.on_canvas_release)
        
        # Set up initial blank canvas
        self.ax.imshow(np.ones((400, 600, 3), dtype=np.uint8) * 240)
        self.canvas.draw()
    
    def update_shape_type(self):
        """Update the current shape type."""
        self.current_label = self.shape_var.get()
        self.status_var.set(f"Shape type set to: {self.current_label}")
    
    def update_point_mode(self):
        """Update the current point interaction mode."""
        self.point_mode = self.point_mode_var.get()
        self.status_var.set(f"Point mode set to: {self.point_mode}")
    
    def load_image(self):
        """Load an image from file."""
        file_path = filedialog.askopenfilename(
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tif *.tiff")]
        )
        
        if not file_path:
            return
        
        try:
            self.image_path = file_path
            self.original_image = cv2.imread(file_path)
            self.display_image = self.original_image.copy()
            
            # Reset the matplotlib canvas with the new image
            self.ax.clear()
            self.ax.imshow(cv2.cvtColor(self.original_image, cv2.COLOR_BGR2RGB))
            self.ax.set_title(os.path.basename(file_path))
            self.ax.set_xticks([])
            self.ax.set_yticks([])
            self.canvas.draw()
            
            # Reset current shape and update status
            self.current_shape = []
            self.all_shapes = []
            self.status_var.set(f"Loaded image: {os.path.basename(file_path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load image: {str(e)}")
    
    def load_annotations(self):
        """Load annotations from a JSON file."""
        file_path = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json")]
        )
        
        if not file_path:
            return
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Clear current annotations
            self.all_shapes = []
            
            # Load shapes from JSON
            for shape in data.get("shapes", []):
                self.all_shapes.append({
                    "label": shape.get("label", "default"),
                    "group_id": shape.get("group_id", len(self.all_shapes) + 1),
                    "points": shape.get("points", [])
                })
            
            # Redraw the canvas
            self.refresh_canvas()
            self.status_var.set(f"Loaded annotations from: {os.path.basename(file_path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load annotations: {str(e)}")
    
    def save_annotations(self):
        """Save annotations to a JSON file."""
        if not self.all_shapes:
            messagebox.showinfo("Info", "No shapes to save.")
            return
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json")]
        )
        
        if not file_path:
            return
        
        try:
            data = {
                "shapes": self.all_shapes
            }
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.status_var.set(f"Saved annotations to: {os.path.basename(file_path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save annotations: {str(e)}")
    
    def export_mask(self):
        """Export the current annotations as a segmentation mask."""
        if not self.image_path or not self.all_shapes:
            messagebox.showinfo("Info", "No image or shapes available.")
            return
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG files", "*.png"), ("All files", "*.*")]
        )
        
        if not file_path:
            return
        
        try:
            # Create mask with same dimensions as original image
            h, w = self.original_image.shape[:2]
            mask = np.zeros((h, w, 3), dtype=np.uint8)
            
            # Draw each shape on the mask
            for shape in self.all_shapes:
                label = shape.get("label", "default")
                points = shape.get("points", [])
                color = self.class_colors.get(label, self.class_colors["default"])
                
                if not points:
                    continue
                
                # Convert points to numpy array
                points = np.array(points, dtype=np.int32)
                points = points.reshape((-1, 1, 2))
                
                # Fill the shape on the mask
                cv2.fillPoly(mask, [points], color)
            
            # Save the mask
            cv2.imwrite(file_path, mask)
            
            # Display the mask
            plt.figure(figsize=(8, 6))
            plt.imshow(cv2.cvtColor(mask, cv2.COLOR_BGR2RGB))
            plt.title("Generated Segmentation Mask")
            plt.axis('off')
            plt.show()
            
            self.status_var.set(f"Exported mask to: {os.path.basename(file_path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export mask: {str(e)}")
    
    def convert_points_to_mask(self):
        """Convert the current point annotations to a segmentation mask and display it."""
        if not self.image_path or not self.all_shapes:
            messagebox.showinfo("Info", "No image or shapes available.")
            return
        
        try:
            # Create mask with same dimensions as original image
            h, w = self.original_image.shape[:2]
            self.mask = np.zeros((h, w, 3), dtype=np.uint8)
            
            # Draw each shape on the mask
            for shape in self.all_shapes:
                label = shape.get("label", "default")
                points = shape.get("points", [])
                color = self.class_colors.get(label, self.class_colors["default"])
                
                if not points:
                    continue
                
                # Convert points to numpy array
                points = np.array

# Convert points to numpy array
                points = np.array(points, dtype=np.int32)
                points = points.reshape((-1, 1, 2))
                
                # Fill the shape on the mask
                cv2.fillPoly(self.mask, [points], color)
            
            # Display the mask
            self.ax.clear()
            self.ax.imshow(cv2.cvtColor(self.mask, cv2.COLOR_BGR2RGB))
            self.ax.set_title("Segmentation Mask")
            self.ax.set_xticks([])
            self.ax.set_yticks([])
            self.canvas.draw()
            
            self.status_var.set("Converted points to mask")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to convert points to mask: {str(e)}")
    
    def convert_mask_to_points(self):
        """Convert the current mask back to point annotations."""
        if self.mask is None:
            messagebox.showinfo("Info", "No mask available. Generate a mask first.")
            return
        
        try:
            # Get parameters
            point_density = self.density_var.get()
            min_points = self.min_points_var.get()
            max_points = self.max_points_var.get()
            
            # Convert mask to grayscale for contour finding
            mask_gray = cv2.cvtColor(self.mask, cv2.COLOR_BGR2GRAY)
            
            # Find contours in the mask
            contours, _ = cv2.findContours(mask_gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            
            # Reset shapes
            self.all_shapes = []
            
            # Process each contour
            for i, contour in enumerate(contours):
                # Get a point from the contour to sample the color
                if len(contour) > 0:
                    sample_point = tuple(contour[0][0])
                    if 0 <= sample_point[1] < self.mask.shape[0] and 0 <= sample_point[0] < self.mask.shape[1]:
                        color = tuple(self.mask[sample_point[1], sample_point[0]])
                    else:
                        color = self.class_colors["default"]
                    
                    # Find the matching label based on color
                    label = "default"
                    for class_name, class_color in self.class_colors.items():
                        if np.array_equal(color, class_color):
                            label = class_name
                            break
                    
                    # Calculate number of points based on contour properties
                    area = cv2.contourArea(contour)
                    perimeter = cv2.arcLength(contour, True)
                    num_points = int(np.sqrt(area) * point_density)
                    num_points = max(min(num_points, max_points), min_points)
                    
                    # Simplify the contour to the desired number of points
                    epsilon = 0.01 * perimeter
                    approx_contour = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # Adjust epsilon to get close to the desired number of points
                    while len(approx_contour) > num_points and epsilon < 1.0:
                        epsilon *= 1.2
                        approx_contour = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # If we have too few points, use more points from the original contour
                    if len(approx_contour) < num_points and len(contour) > num_points:
                        step = len(contour) // num_points
                        indices = [i * step for i in range(num_points)]
                        approx_contour = contour[indices]
                    
                    # Format the points
                    points = [list(map(int, point[0])) for point in approx_contour]
                    
                    # Add the shape to the result
                    self.all_shapes.append({
                        "label": label,
                        "group_id": i + 1,
                        "points": points
                    })
            
            # Switch back to the original image and draw the shapes
            self.refresh_canvas()
            self.status_var.set(f"Converted mask to {len(self.all_shapes)} shapes with points")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to convert mask to points: {str(e)}")
    
    def on_canvas_click(self, event):
        """Handle mouse clicks on the canvas."""
        if event.xdata is None or event.ydata is None:
            return  # Click outside the plot area
        
        # Get coordinates
        x, y = int(event.xdata), int(event.ydata)
        
        # Check bounds
        if self.original_image is not None:
            h, w = self.original_image.shape[:2]
            if x < 0 or x >= w or y < 0 or y >= h:
                return
        
        # Different actions based on point mode
        if self.point_mode == "add":
            # Add a point to the current shape
            self.current_shape.append([x, y])
            self.refresh_canvas()
            self.status_var.set(f"Added point at ({x}, {y})")
        
        elif self.point_mode == "move":
            # Select a point to move
            self.select_point_or_shape(x, y)
            if self.selected_shape_idx >= 0 and self.selected_point_idx >= 0:
                self.dragging = True
        
        elif self.point_mode == "delete":
            # Delete a point
            self.select_point_or_shape(x, y)
            if self.selected_shape_idx >= 0 and self.selected_point_idx >= 0:
                # Remove the point
                del self.all_shapes[self.selected_shape_idx]["points"][self.selected_point_idx]
                self.refresh_canvas()
                self.status_var.set(f"Deleted point from shape {self.selected_shape_idx + 1}")
                
                # If the shape has too few points, remove it
                if len(self.all_shapes[self.selected_shape_idx]["points"]) < 3:
                    del self.all_shapes[self.selected_shape_idx]
                    self.status_var.set(f"Removed shape with too few points")
                
                # Reset selection
                self.selected_shape_idx = -1
                self.selected_point_idx = -1
    
    def on_canvas_move(self, event):
        """Handle mouse movement on the canvas."""
        if event.xdata is None or event.ydata is None:
            return  # Move outside the plot area
        
        # Get coordinates
        x, y = int(event.xdata), int(event.ydata)
        
        # Check bounds
        if self.original_image is not None:
            h, w = self.original_image.shape[:2]
            if x < 0 or x >= w or y < 0 or y >= h:
                return
        
        # If dragging a point, move it
        if self.dragging and self.selected_shape_idx >= 0 and self.selected_point_idx >= 0:
            self.all_shapes[self.selected_shape_idx]["points"][self.selected_point_idx] = [x, y]
            self.refresh_canvas()
            self.status_var.set(f"Moving point to ({x}, {y})")
        
        # If adding points, show preview of line
        elif self.point_mode == "add" and self.current_shape:
            # Refresh canvas to show the preview line
            self.refresh_canvas(preview_point=(x, y))
    
    def on_canvas_release(self, event):
        """Handle mouse release on the canvas."""
        self.dragging = False
    
    def select_point_or_shape(self, x, y):
        """Select a point or shape based on click position."""
        threshold = 10  # Distance threshold for selection
        
        self.selected_shape_idx = -1
        self.selected_point_idx = -1
        
        # Check each shape
        for shape_idx, shape in enumerate(self.all_shapes):
            points = shape.get("points", [])
            
            # Check each point in the shape
            for point_idx, point in enumerate(points):
                px, py = point
                dist = np.sqrt((px - x)**2 + (py - y)**2)
                
                if dist < threshold:
                    self.selected_shape_idx = shape_idx
                    self.selected_point_idx = point_idx
                    self.status_var.set(f"Selected point {point_idx + 1} of shape {shape_idx + 1}")
                    return
    
    def complete_shape(self):
        """Complete the current shape and add it to the list of shapes."""
        if len(self.current_shape) < 3:
            messagebox.showinfo("Info", "Need at least 3 points to complete a shape.")
            return
        
        # Add the shape to the list
        self.all_shapes.append({
            "label": self.current_label,
            "group_id": len(self.all_shapes) + 1,
            "points": self.current_shape
        })
        
        # Reset current shape
        self.current_shape = []
        self.refresh_canvas()
        self.status_var.set(f"Completed {self.current_label} shape")
    
    def cancel_current_shape(self):
        """Cancel the current shape being drawn."""
        self.current_shape = []
        self.refresh_canvas()
        self.status_var.set("Cancelled current shape")
    
    def clear_all(self):
        """Clear all shapes."""
        if self.all_shapes and messagebox.askyesno("Confirm", "Are you sure you want to clear all shapes?"):
            self.all_shapes = []
            self.current_shape = []
            self.refresh_canvas()
            self.status_var.set("Cleared all shapes")
    
    def refresh_canvas(self, preview_point=None):
        """Refresh the canvas with all shapes and current drawing."""
        # Clear the canvas
        self.ax.clear()
        
        # Draw the base image
        if self.original_image is not None:
            self.ax.imshow(cv2.cvtColor(self.original_image, cv2.COLOR_BGR2RGB))
        else:
            self.ax.imshow(np.ones((400, 600, 3), dtype=np.uint8) * 240)
        
        # Draw all existing shapes
        for shape_idx, shape in enumerate(self.all_shapes):
            label = shape.get("label", "default")
            points = shape.get("points", [])
            
            if not points:
                continue
            
            # Convert bgr to rgb for matplotlib
            color_bgr = self.class_colors.get(label, self.class_colors["default"])
            color_rgb = (color_bgr[2]/255, color_bgr[1]/255, color_bgr[0]/255)
            
            # Draw the shape
            polygon = patches.Polygon(points, closed=True, fill=True, 
                                     alpha=0.3, color=color_rgb)
            self.ax.add_patch(polygon)
            
            # Draw the points
            for point_idx, point in enumerate(points):
                # Highlight selected point
                if shape_idx == self.selected_shape_idx and point_idx == self.selected_point_idx:
                    self.ax.plot(point[0], point[1], 'ro', markersize=8)
                else:
                    self.ax.plot(point[0], point[1], 'ko', markersize=6)
                
                # Draw point index
                self.ax.text(point[0]+5, point[1]+5, str(point_idx+1), 
                            fontsize=8, color='black', ha='left', va='bottom')
        
        # Draw the current shape being created
        if self.current_shape:
            # Convert current shape to numpy array
            points = np.array(self.current_shape)
            
            # Draw the lines
            if len(points) > 1:
                self.ax.plot(points[:, 0], points[:, 1], 'b-', linewidth=2)
            
            # Draw the points
            self.ax.plot(points[:, 0], points[:, 1], 'ko', markersize=6)
            
            # Draw point indices
            for i, point in enumerate(points):
                self.ax.text(point[0]+5, point[1]+5, str(i+1), 
                            fontsize=8, color='black', ha='left', va='bottom')
            
            # If preview point is provided, draw a line to it
            if preview_point and len(self.current_shape) > 0:
                last_point = self.current_shape[-1]
                self.ax.plot([last_point[0], preview_point[0]], 
                            [last_point[1], preview_point[1]], 'b--', linewidth=1)
        
        # Update the plot
        self.ax.set_title("Annotation Canvas")
        self.ax.set_xticks([])
        self.ax.set_yticks([])
        self.canvas.draw()

def main():
    root = tk.Tk()
    app = PointMaskAnnotationGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()